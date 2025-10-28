-- Migration: Automatic synchronization between auth.users and public.users
-- This ensures that when a user is created in public.users, they are also created in auth.users

BEGIN;

-- 1. Создаем функцию для синхронизации пользователя в auth.users
CREATE OR REPLACE FUNCTION sync_user_to_auth()
RETURNS TRIGGER AS $$
DECLARE
  random_password TEXT;
  password_hash TEXT;
BEGIN
  -- Проверяем, существует ли пользователь в auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    -- Генерируем временный пароль (можно сменить через функцию сброса пароля)
    random_password := encode(gen_random_bytes(16), 'hex');

    -- Используем существующий хеш из public.users, если он есть
    IF NEW.password_hash IS NOT NULL AND NEW.password_hash != '' THEN
      password_hash := NEW.password_hash;
    ELSE
      -- Если хеша нет, используем bcrypt хеш случайного пароля
      -- Это временный пароль, который нужно будет сбросить
      password_hash := crypt(random_password, gen_salt('bf'));
    END IF;

    -- Создаем пользователя в auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      role,
      aud
    ) VALUES (
      NEW.id,
      '00000000-0000-0000-0000-000000000000',
      NEW.email,
      password_hash,
      NOW(), -- Email сразу подтвержден
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      jsonb_build_object(
        'role', NEW.role,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'organization_id', NEW.organization_id::text
      ),
      COALESCE(NEW.created_at, NOW()),
      NOW(),
      '',
      'authenticated',
      'authenticated'
    );

    -- Создаем identity для email провайдера
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.id::text,
      NEW.id,
      jsonb_build_object(
        'sub', NEW.id::text,
        'email', NEW.email
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    RAISE NOTICE 'User % synced to auth.users', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Создаем триггер на INSERT в public.users
DROP TRIGGER IF EXISTS sync_user_to_auth_trigger ON users;
CREATE TRIGGER sync_user_to_auth_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_auth();

-- 3. Создаем функцию для обновления метаданных в auth.users при изменении в public.users
CREATE OR REPLACE FUNCTION sync_user_metadata_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем метаданные в auth.users при изменении role, first_name, last_name, organization_id
  IF (OLD.role IS DISTINCT FROM NEW.role) OR
     (OLD.first_name IS DISTINCT FROM NEW.first_name) OR
     (OLD.last_name IS DISTINCT FROM NEW.last_name) OR
     (OLD.organization_id IS DISTINCT FROM NEW.organization_id) OR
     (OLD.email IS DISTINCT FROM NEW.email) THEN

    UPDATE auth.users
    SET
      raw_user_meta_data = jsonb_build_object(
        'role', NEW.role,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'organization_id', NEW.organization_id::text
      ),
      email = NEW.email,
      updated_at = NOW()
    WHERE id = NEW.id;

    RAISE NOTICE 'User metadata synced for %', NEW.email;
  END IF;

  -- Обновляем password_hash если он изменился
  IF OLD.password_hash IS DISTINCT FROM NEW.password_hash AND
     NEW.password_hash IS NOT NULL AND
     NEW.password_hash != '' THEN

    UPDATE auth.users
    SET
      encrypted_password = NEW.password_hash,
      updated_at = NOW()
    WHERE id = NEW.id;

    RAISE NOTICE 'Password updated for %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Создаем триггер на UPDATE в public.users
DROP TRIGGER IF EXISTS sync_user_metadata_to_auth_trigger ON users;
CREATE TRIGGER sync_user_metadata_to_auth_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata_to_auth();

-- 5. Синхронизируем существующих пользователей из public.users в auth.users
-- Это нужно для пользователей, созданных до внедрения триггера
DO $$
DECLARE
  user_record RECORD;
  password_hash TEXT;
BEGIN
  FOR user_record IN
    SELECT u.*
    FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE au.id IS NULL
  LOOP
    -- Используем существующий хеш или создаем новый
    IF user_record.password_hash IS NOT NULL AND user_record.password_hash != '' THEN
      password_hash := user_record.password_hash;
    ELSE
      password_hash := crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf'));
    END IF;

    -- Создаем пользователя в auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      role,
      aud
    ) VALUES (
      user_record.id,
      '00000000-0000-0000-0000-000000000000',
      user_record.email,
      password_hash,
      NOW(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      jsonb_build_object(
        'role', user_record.role,
        'first_name', user_record.first_name,
        'last_name', user_record.last_name,
        'organization_id', user_record.organization_id::text
      ),
      COALESCE(user_record.created_at, NOW()),
      NOW(),
      '',
      'authenticated',
      'authenticated'
    ) ON CONFLICT (id) DO UPDATE SET
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      email = EXCLUDED.email,
      updated_at = NOW();

    -- Создаем identity
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      user_record.id::text,
      user_record.id,
      jsonb_build_object(
        'sub', user_record.id::text,
        'email', user_record.email
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    RAISE NOTICE 'Synced existing user: %', user_record.email;
  END LOOP;
END $$;

COMMIT;

-- Проверка
SELECT 'Migration 017 completed successfully - Users will now auto-sync to auth.users' as status;

-- Показываем сколько пользователей было синхронизировано
SELECT
  COUNT(*) as total_users,
  COUNT(au.id) as users_in_auth,
  COUNT(*) - COUNT(au.id) as users_missing_from_auth
FROM users u
LEFT JOIN auth.users au ON u.id = au.id;

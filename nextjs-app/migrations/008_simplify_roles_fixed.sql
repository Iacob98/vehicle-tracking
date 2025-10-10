-- Migration 008: Simplify user roles from 5 to 4 (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Date: 2025-10-10
-- Goal: owner+admin → admin, team_lead+worker → driver, add viewer role

-- ВАЖНО: Сделать backup БД перед выполнением!

BEGIN;

-- Шаг 1: Создать новый временный тип с упрощенными ролями
DO $$
BEGIN
    -- Удалить временный тип если остался от предыдущей попытки
    DROP TYPE IF EXISTS user_role_temp CASCADE;

    -- Создать новый временный тип
    CREATE TYPE user_role_temp AS ENUM ('admin', 'manager', 'driver', 'viewer');

    RAISE NOTICE 'Создан временный тип user_role_temp';
END $$;

-- Шаг 2: Добавить временную колонку для новых ролей
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_temp user_role_temp;

-- Шаг 3: Мигрировать существующие роли в новые
UPDATE users SET role_temp =
  CASE
    WHEN role::text IN ('owner', 'admin') THEN 'admin'::user_role_temp
    WHEN role::text = 'manager' THEN 'manager'::user_role_temp
    WHEN role::text IN ('team_lead', 'worker') THEN 'driver'::user_role_temp
    ELSE 'viewer'::user_role_temp  -- на случай если будут NULL или неизвестные роли
  END;

-- Шаг 4: Проверка что все роли мигрировали
DO $$
DECLARE
    unmigrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_count
    FROM users
    WHERE role_temp IS NULL;

    IF unmigrated_count > 0 THEN
        RAISE EXCEPTION 'Не все пользователи мигрировали! Осталось: %', unmigrated_count;
    END IF;

    RAISE NOTICE 'Все пользователи успешно мигрировали!';
END $$;

-- Шаг 5: Удалить старую колонку role
ALTER TABLE users DROP COLUMN role CASCADE;

-- Шаг 6: Переименовать временную колонку
ALTER TABLE users RENAME COLUMN role_temp TO role;

-- Шаг 7: Установить NOT NULL и default
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';

-- Шаг 8: Удалить старый enum type (теперь можем безопасно)
DROP TYPE IF EXISTS user_role CASCADE;

-- Шаг 9: Переименовать временный тип в постоянный
ALTER TYPE user_role_temp RENAME TO user_role;

-- Шаг 10: Вывести статистику миграции
DO $$
DECLARE
    admin_count INTEGER;
    manager_count INTEGER;
    driver_count INTEGER;
    viewer_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO manager_count FROM users WHERE role = 'manager';
    SELECT COUNT(*) INTO driver_count FROM users WHERE role = 'driver';
    SELECT COUNT(*) INTO viewer_count FROM users WHERE role = 'viewer';
    SELECT COUNT(*) INTO total_count FROM users;

    RAISE NOTICE '=== Результаты миграции ролей ===';
    RAISE NOTICE 'Админов:     % (owner + admin)', admin_count;
    RAISE NOTICE 'Менеджеров:  %', manager_count;
    RAISE NOTICE 'Водителей:   % (team_lead + worker)', driver_count;
    RAISE NOTICE 'Просмотр:    %', viewer_count;
    RAISE NOTICE 'Всего:       %', total_count;
END $$;

COMMIT;

-- Проверка после миграции
SELECT
    role,
    COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

COMMENT ON TYPE user_role IS 'Упрощенные роли пользователей: admin (полный доступ), manager (управление), driver (водитель), viewer (только чтение)';
COMMENT ON COLUMN users.role IS 'Роль пользователя: admin, manager, driver, viewer';

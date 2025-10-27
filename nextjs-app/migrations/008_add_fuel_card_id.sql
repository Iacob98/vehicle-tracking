-- Migration 008: Add fuel_card_id to users
-- Добавление поля fuel_card_id для привязки заправочной карты к водителю

-- Добавляем колонку fuel_card_id в таблицу users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fuel_card_id VARCHAR(50);

-- Создаем индекс для быстрого поиска по fuel_card_id
CREATE INDEX IF NOT EXISTS idx_users_fuel_card_id ON users(fuel_card_id);

-- Комментарий
COMMENT ON COLUMN users.fuel_card_id IS 'ID заправочной карты водителя (номер карты для заправок)';

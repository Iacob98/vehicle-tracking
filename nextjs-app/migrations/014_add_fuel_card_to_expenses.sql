-- Migration 014: Add fuel_card_id to car_expenses
-- Добавление поля fuel_card_id в таблицу car_expenses для связи расходов с заправочной картой

BEGIN;

-- Добавляем колонку fuel_card_id
ALTER TABLE car_expenses
ADD COLUMN IF NOT EXISTS fuel_card_id VARCHAR(50);

-- Создаем индекс для быстрого поиска по fuel_card_id
CREATE INDEX IF NOT EXISTS idx_car_expenses_fuel_card_id
ON car_expenses(fuel_card_id)
WHERE fuel_card_id IS NOT NULL;

-- Комментарии
COMMENT ON COLUMN car_expenses.fuel_card_id IS 'Номер заправочной карты (для связи с лимитами)';

COMMIT;

-- Migration 007: Make vehicles storage bucket public
-- Date: 2025-10-10
-- Reason: Next.js Image Optimization требует публичный доступ к изображениям

-- Сделать bucket vehicles публичным для доступа к фотографиям автомобилей
UPDATE storage.buckets
SET public = true
WHERE name = 'vehicles';

-- RLS политики уже настроены правильно в предыдущих миграциях:
-- - "Public can view vehicles bucket" - разрешает публичное чтение
-- - "Users can view vehicle files" - разрешает чтение для authenticated пользователей

-- Проверка
SELECT id, name, public FROM storage.buckets WHERE name = 'vehicles';
-- Ожидается: public = true

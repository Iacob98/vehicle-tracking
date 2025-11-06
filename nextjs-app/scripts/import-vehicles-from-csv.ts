import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ID временной организации "Импорт"
const IMPORT_ORG_ID = 'a6087353-5840-4fec-831b-514547906f3f';

interface CSVRow {
  id: string;
  organization_id: string;
  name: string;
  license_plate: string;
  vin: string;
  status: string;
  photo_url: string;
  created_at: string;
  model: string;
  year: string;
  is_rental: string;
  rental_start_date: string;
  rental_end_date: string;
  rental_monthly_price: string;
}

interface VehicleInsert {
  organization_id: string;
  name: string;
  license_plate: string;
  vin: string | null;
  status: 'active' | 'repair' | 'unavailable' | 'rented';
  model: string | null;
  year: number | null;
  photo_url: string | null;
  is_rental: boolean;
  rental_start_date: string | null;
  rental_end_date: string | null;
  rental_monthly_price: number | null;
  vehicle_type_id: string | null;
}

// Маппинг названий моделей к ID типов автомобилей
const vehicleTypesMap = new Map<string, string>();

async function loadVehicleTypes() {
  console.log('📦 Загрузка типов автомобилей...');
  const { data, error } = await supabase
    .from('vehicle_types')
    .select('id, name');

  if (error) {
    console.error('❌ Ошибка загрузки типов:', error);
    return;
  }

  if (data) {
    data.forEach((type) => {
      vehicleTypesMap.set(type.name, type.id);
    });
    console.log(`✅ Загружено ${data.length} типов автомобилей`);
  }
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 't';
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

function cleanString(value: string): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

function mapCSVRowToVehicle(row: CSVRow): VehicleInsert {
  const model = cleanString(row.model);
  const vehicleTypeId = model ? vehicleTypesMap.get(model) || null : null;

  return {
    organization_id: IMPORT_ORG_ID,
    name: row.name.trim(),
    license_plate: row.license_plate.trim(),
    vin: cleanString(row.vin),
    status: (row.status.trim() as any) || 'active',
    model: model,
    year: parseNumber(row.year),
    photo_url: cleanString(row.photo_url),
    is_rental: parseBoolean(row.is_rental),
    rental_start_date: parseDate(row.rental_start_date),
    rental_end_date: parseDate(row.rental_end_date),
    rental_monthly_price: parseNumber(row.rental_monthly_price),
    vehicle_type_id: vehicleTypeId,
  };
}

async function importVehicles() {
  console.log('🚀 Начало импорта автомобилей...\n');

  // Загружаем типы автомобилей
  await loadVehicleTypes();

  // Читаем CSV файл
  const csvPath = path.join(__dirname, '../../autocvs/vehicles.csv');
  console.log(`📂 Чтение файла: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Файл не найден: ${csvPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Найдено записей в CSV: ${records.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ vehicle: string; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const vehicleData = mapCSVRowToVehicle(row);

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicleData)
        .select('id, name, license_plate');

      if (error) {
        errorCount++;
        errors.push({
          vehicle: `${row.name} (${row.license_plate})`,
          error: error.message,
        });
        console.error(`❌ [${i + 1}/${records.length}] Ошибка: ${row.name} - ${error.message}`);
      } else {
        successCount++;
        console.log(
          `✅ [${i + 1}/${records.length}] Импортирован: ${data[0].name} (${data[0].license_plate})`
        );
      }

      // Задержка 100ms между запросами
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      errorCount++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({
        vehicle: `${row.name} (${row.license_plate})`,
        error: errorMsg,
      });
      console.error(`❌ [${i + 1}/${records.length}] Исключение: ${row.name} - ${errorMsg}`);
    }
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(60));
  console.log('📈 ИТОГИ ИМПОРТА');
  console.log('='.repeat(60));
  console.log(`✅ Успешно импортировано: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📊 Всего обработано: ${records.length}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ ДЕТАЛИ ОШИБОК:');
    errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.vehicle}`);
      console.log(`   Причина: ${err.error}\n`);
    });
  }

  // Проверка результатов
  console.log('\n🔍 Проверка результатов в базе данных...');
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', IMPORT_ORG_ID);

  console.log(`✅ В организации "Импорт" теперь ${count} автомобилей`);
}

// Запуск импорта
importVehicles()
  .then(() => {
    console.log('\n✅ Импорт завершен!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Критическая ошибка:', err);
    process.exit(1);
  });

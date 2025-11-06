'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostFormData } from '@/lib/api-client';
import Link from 'next/link';
import { carExpenseSchema, CAR_EXPENSE_CATEGORY_OPTIONS, type CarExpenseFormData } from '@/lib/schemas/car-expenses.schema';
import { OrganizationSelect } from '@/components/OrganizationSelect';

// User type definition (client-safe)
type UserRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'driver';

interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  organization_id: string | null;
  phone?: string;
  created_at?: string;
}

// Client-side Super Admin check
function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

interface Organization {
  id: string;
  name: string;
}

interface CarExpenseFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
    last_odometer?: number | null;
  }>;
  currentUser: User;
  organizations?: Organization[];
}

export function CarExpenseForm({ vehicles, currentUser, organizations = [] }: CarExpenseFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const showOrgSelect = isSuperAdmin(currentUser);

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostFormData('/api/car-expenses', {
    onSuccess: () => {
      router.push('/dashboard/car-expenses');
      router.refresh();
    },
  });

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarExpenseFormData>({
    resolver: zodResolver(carExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      category: 'fuel',
      organization_id: undefined,
    },
  });

  const selectedOrgId = watch('organization_id');
  const selectedCategory = watch('category');
  const selectedVehicleId = watch('vehicle_id');
  const litersValue = watch('liters');
  const amountValue = watch('amount');
  const odometerValue = watch('odometer_reading');

  // Find selected vehicle to get last odometer reading
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const lastOdometer = selectedVehicle?.last_odometer;

  // Calculate price per liter for fuel
  const pricePerLiter = selectedCategory === 'fuel' && litersValue && amountValue
    ? (amountValue / litersValue).toFixed(2)
    : null;

  const onSubmit = async (data: CarExpenseFormData) => {
    // Validate odometer for fuel expenses
    if (data.category === 'fuel') {
      if (!data.liters || !data.odometer_reading) {
        alert('Для заправки обязательны поля: Литры и Показания одометра');
        return;
      }

      if (lastOdometer && data.odometer_reading < lastOdometer) {
        alert(`Показания одометра (${data.odometer_reading} км) не могут быть меньше предыдущего значения (${lastOdometer} км)`);
        return;
      }
    }
    // Подготовка FormData для отправки на сервер
    const formData = new FormData();

    formData.append('vehicle_id', data.vehicle_id);
    formData.append('category', data.category);
    formData.append('amount', data.amount.toString());
    formData.append('date', data.date);
    formData.append('description', data.description || '');
    formData.append('maintenance_id', data.maintenance_id || '');

    // Для заправки - добавляем литры и одометр
    if (data.category === 'fuel') {
      if (data.liters) {
        formData.append('liters', data.liters.toString());
      }
      if (data.odometer_reading) {
        formData.append('odometer_reading', data.odometer_reading.toString());
      }
    }

    // Для Super Admin - добавляем organization_id
    if (showOrgSelect && data.organization_id) {
      formData.append('organization_id', data.organization_id);
    }

    // Добавляем фото чеков если выбраны (поддержка множественных фото)
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file, index) => {
        formData.append('receipt', file);
      });
    } else if (selectedFile) {
      // Обратная совместимость со старым кодом
      formData.append('receipt', selectedFile);
    }

    // Отправляем через API
    await post(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      {/* Organization Selection (Super Admin only) */}
      {showOrgSelect && (
        <div className="space-y-4 pb-4 border-b">
          <h2 className="text-lg font-semibold">🏢 Организация</h2>
          <OrganizationSelect
            organizations={organizations}
            value={selectedOrgId || undefined}
            onValueChange={(value) => setValue('organization_id', value)}
            error={errors.organization_id?.message}
            required={true}
          />
          <p className="text-sm text-gray-500">
            Выберите организацию, для которой создаётся расход
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vehicle_id">
            🚗 Автомобиль / Fahrzeug *
          </Label>
          <select
            id="vehicle_id"
            {...register('vehicle_id')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.vehicle_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Выберите автомобиль</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.license_plate})
              </option>
            ))}
          </select>
          {errors.vehicle_id && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicle_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">
            📁 Категория / Kategorie *
          </Label>
          <select
            id="category"
            {...register('category')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {CAR_EXPENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="date">
            📅 Дата / Datum *
          </Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={errors.date ? 'border-red-500' : ''}
          />
          {errors.date && (
            <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="amount">
            💰 Сумма / Betrag (€) *
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
            className={errors.amount ? 'border-red-500' : ''}
          />
          {errors.amount && (
            <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Fuel-specific fields */}
        {selectedCategory === 'fuel' && (
          <>
            <div>
              <Label htmlFor="liters">
                ⛽ Литры / Liter *
              </Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                {...register('liters', { valueAsNumber: true })}
                placeholder="50.00"
                className={errors.liters ? 'border-red-500' : ''}
              />
              {errors.liters && (
                <p className="text-sm text-red-600 mt-1">{errors.liters.message}</p>
              )}
              {pricePerLiter && (
                <p className="text-sm text-green-600 mt-1">
                  💶 Цена за литр: {pricePerLiter} €/л
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="odometer_reading">
                🛣️ Одометр (км) / Kilometerstand *
              </Label>
              <Input
                id="odometer_reading"
                type="number"
                {...register('odometer_reading', { valueAsNumber: true })}
                placeholder={lastOdometer ? `> ${lastOdometer}` : '0'}
                className={errors.odometer_reading ? 'border-red-500' : ''}
              />
              {errors.odometer_reading && (
                <p className="text-sm text-red-600 mt-1">{errors.odometer_reading.message}</p>
              )}
              {lastOdometer && (
                <p className="text-sm text-blue-600 mt-1">
                  📊 Предыдущее значение: {lastOdometer.toLocaleString()} км
                </p>
              )}
              {lastOdometer && odometerValue && odometerValue > lastOdometer && (
                <p className="text-sm text-green-600 mt-1">
                  📏 Пройдено: {(odometerValue - lastOdometer).toLocaleString()} км
                </p>
              )}
            </div>
          </>
        )}

        <div className="col-span-2">
          <Label htmlFor="description">
            📝 Описание / Beschreibung
          </Label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Дополнительная информация о расходе..."
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="receipt">
            📷 Фото чека{selectedCategory === 'fuel' ? ' и одометра' : ''} / Beleg Foto{selectedCategory === 'fuel' ? ' und Kilometerstand' : ''}
          </Label>
          <Input
            id="receipt"
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setSelectedFiles(files);
              // Keep backward compatibility
              setSelectedFile(files[0] || null);
            }}
          />
          {selectedFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedFiles.map((file, index) => (
                <p key={index} className="text-sm text-green-600">
                  ✅ {index + 1}. {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              ))}
            </div>
          )}
          {selectedCategory === 'fuel' && (
            <p className="text-sm text-gray-500 mt-1">
              💡 Загрузите фото чека и показаний одометра (можно несколько фото)
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Добавить расход'}
        </Button>
        <Link href="/dashboard/car-expenses">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON } from '@/lib/api-client';
import Link from 'next/link';
import { maintenanceSchema, MAINTENANCE_TYPE_OPTIONS, type MaintenanceFormData } from '@/lib/schemas';

interface MaintenanceFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
  }>;
}

export function MaintenanceForm({ vehicles }: MaintenanceFormProps) {
  const router = useRouter();

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostJSON('/api/maintenance', {
    onSuccess: () => {
      router.push('/dashboard/maintenance');
      router.refresh();
    },
  });

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      scheduled_date: new Date().toISOString().split('T')[0],
      type: 'inspection',
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    await post({
      vehicle_id: data.vehicle_id,
      type: data.type,
      scheduled_date: data.scheduled_date,
      description: data.description || null,
      notes: data.notes || null,
      completed_date: data.completed_date || null,
      cost: data.cost || null,
      mileage: data.mileage || null,
      next_maintenance_date: data.next_maintenance_date || null,
      next_maintenance_mileage: data.next_maintenance_mileage || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

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
          <Label htmlFor="type">
            🔧 Тип обслуживания / Wartungstyp *
          </Label>
          <select
            id="type"
            {...register('type')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {MAINTENANCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="date">
            📅 Дата / Datum *
          </Label>
          <Input
            id="scheduled_date"
            type="date"
            {...register('scheduled_date')}
            className={errors.scheduled_date ? 'border-red-500' : ''}
          />
          {errors.scheduled_date && (
            <p className="text-sm text-red-600 mt-1">{errors.scheduled_date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="mileage">
            🛣️ Текущий пробег / Kilometerstand (км)
          </Label>
          <Input
            id="mileage"
            type="number"
            {...register('mileage', { valueAsNumber: true })}
            placeholder="Опционально"
            className={errors.mileage ? 'border-red-500' : ''}
          />
          {errors.mileage && (
            <p className="text-sm text-red-600 mt-1">{errors.mileage.message}</p>
          )}
        </div>

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
            placeholder="Описание работ, замененные детали..."
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes">
            📋 Заметки / Notizen
          </Label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={2}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.notes ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Дополнительные заметки, рекомендации..."
          />
          {errors.notes && (
            <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Next maintenance info */}
        <div className="col-span-2 pt-4 border-t">
          <h3 className="text-sm font-medium mb-3">🔮 Следующее обслуживание (опционально)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="next_maintenance_date">
                📅 Дата следующего ТО
              </Label>
              <Input
                id="next_maintenance_date"
                type="date"
                {...register('next_maintenance_date')}
                className={errors.next_maintenance_date ? 'border-red-500' : ''}
              />
              {errors.next_maintenance_date && (
                <p className="text-sm text-red-600 mt-1">{errors.next_maintenance_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="next_maintenance_mileage">
                🛣️ Пробег следующего ТО (км)
              </Label>
              <Input
                id="next_maintenance_mileage"
                type="number"
                {...register('next_maintenance_mileage', { valueAsNumber: true })}
                placeholder="Например, 150000"
                className={errors.next_maintenance_mileage ? 'border-red-500' : ''}
              />
              {errors.next_maintenance_mileage && (
                <p className="text-sm text-red-600 mt-1">{errors.next_maintenance_mileage.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Добавить обслуживание'}
        </Button>
        <Link href="/dashboard/maintenance">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

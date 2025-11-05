'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON, usePutJSON } from '@/lib/api-client';
import Link from 'next/link';
import { z } from 'zod';
// Client-safe schema (vehicle types are universal, not organization-specific)
const vehicleTypeFormSchema = z.object({
  name: z.string()
    .min(1, 'Название типа обязательно')
    .max(100, 'Название не должно превышать 100 символов')
    .trim(),
  fuel_consumption_per_100km: z.number()
    .positive('Расход топлива должен быть больше 0')
    .max(99.99, 'Расход не может превышать 99.99 л/100км'),
  tank_capacity: z.number()
    .int('Емкость бака должна быть целым числом')
    .positive('Емкость бака должна быть больше 0')
    .max(1000, 'Емкость бака не может превышать 1000 литров')
    .nullable()
    .optional(),
});

type VehicleTypeFormData = z.infer<typeof vehicleTypeFormSchema>;

interface VehicleTypeFormProps {
  vehicleType?: {
    id: string;
    name: string;
    fuel_consumption_per_100km: number;
    tank_capacity: number | null;
  };
}

export function VehicleTypeForm({
  vehicleType,
}: VehicleTypeFormProps) {
  const router = useRouter();
  const isEditing = !!vehicleType;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<VehicleTypeFormData>({
    resolver: zodResolver(vehicleTypeFormSchema),
    defaultValues: isEditing
      ? {
          name: vehicleType.name,
          fuel_consumption_per_100km: vehicleType.fuel_consumption_per_100km,
          tank_capacity: vehicleType.tank_capacity,
        }
      : {
          fuel_consumption_per_100km: 10.0,
          tank_capacity: undefined,
        },
  });

  const { loading: creating, error: createError, post } = usePostJSON('/api/vehicle-types', {
    onSuccess: () => {
      router.push('/dashboard/vehicle-types');
      router.refresh();
    },
  });

  const { loading: updating, error: updateError, put } = usePutJSON(
    `/api/vehicle-types/${vehicleType?.id}`,
    {
      onSuccess: () => {
        router.push('/dashboard/vehicle-types');
        router.refresh();
      },
    }
  );

  const loading = creating || updating;
  const error = createError || updateError;

  const onSubmit = async (data: VehicleTypeFormData) => {
    const submitData = {
      name: data.name,
      fuel_consumption_per_100km: data.fuel_consumption_per_100km,
      tank_capacity: data.tank_capacity || null,
    };

    if (isEditing) {
      await put(submitData);
    } else {
      await post(submitData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Основная информация</h2>

        {/* Name */}
        <div>
          <Label htmlFor="name">
            Название типа *
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Например: Civic, BMW X5, Mercedes Sprinter"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Укажите модель или тип транспортного средства
          </p>
        </div>

        {/* Fuel Consumption */}
        <div>
          <Label htmlFor="fuel_consumption">
            Расход топлива (л/100км) *
          </Label>
          <Input
            id="fuel_consumption"
            type="number"
            step="0.01"
            min="0.01"
            max="99.99"
            {...register('fuel_consumption_per_100km', {
              valueAsNumber: true,
            })}
            placeholder="13.5"
            className={errors.fuel_consumption_per_100km ? 'border-red-500' : ''}
          />
          {errors.fuel_consumption_per_100km && (
            <p className="text-sm text-red-600 mt-1">
              {errors.fuel_consumption_per_100km.message}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Ожидаемый расход топлива на 100 километров (например: 8.5, 13.0, 15.8)
          </p>
        </div>

        {/* Tank Capacity */}
        <div>
          <Label htmlFor="tank_capacity">
            Емкость бака (литры)
          </Label>
          <Input
            id="tank_capacity"
            type="number"
            min="1"
            max="1000"
            {...register('tank_capacity', {
              setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
            })}
            placeholder="60"
            className={errors.tank_capacity ? 'border-red-500' : ''}
          />
          {errors.tank_capacity && (
            <p className="text-sm text-red-600 mt-1">{errors.tank_capacity.message}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Опционально: Емкость топливного бака для проверки при заправке
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          ℹ️ Как это работает
        </h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• При заправке система рассчитает ожидаемый расход: (пройденное расстояние / 100) × расход типа</li>
          <li>• Если фактический расход превышает ожидаемый более чем на 15%, создается уведомление об аномалии</li>
          <li>• Пример: Проехали 300 км, тип расход 13 л/100км → ожидается 39 л. Если залили 60 л → аномалия!</li>
        </ul>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : isEditing ? 'Сохранить изменения' : 'Создать тип'}
        </Button>
        <Link href="/dashboard/vehicle-types">
          <Button type="button" variant="outline">
            Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

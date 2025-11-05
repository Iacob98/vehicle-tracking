'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostFormData, useApi } from '@/lib/api-client';
import { putJSON } from '@/lib/api-client';
import { vehicleSchema, VEHICLE_STATUS_OPTIONS, type VehicleFormData } from '@/lib/schemas';
import { OrganizationSelect } from '@/components/OrganizationSelect';
import Image from 'next/image';

// User type definition (client-safe, без server-only зависимостей)
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

// Client-side Super Admin check (не требует server-only функций)
function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

interface Organization {
  id: string;
  name: string;
}

interface VehicleType {
  id: string;
  name: string;
  fuel_consumption_per_100km: number;
}

interface VehicleFormProps {
  vehicle?: {
    id: string;
    name: string;
    license_plate: string | null;
    vin: string | null;
    model: string | null;
    year: number | null;
    status: string;
    photo_url: string | null;
    is_rental: boolean | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    rental_monthly_price: number | null;
    vehicle_type_id: string | null;
  };
  isEdit?: boolean;
  currentUser: User;
  organizations?: Organization[];
  vehicleTypes?: VehicleType[];
}

export function VehicleForm({ vehicle, isEdit = false, currentUser, organizations = [], vehicleTypes = [] }: VehicleFormProps) {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const showOrgSelect = isSuperAdmin(currentUser);

  // Используем централизованную обработку ошибок через API hooks
  const createVehicleApi = usePostFormData('/api/vehicles', {
    onSuccess: () => {
      router.push('/dashboard/vehicles');
      router.refresh();
    },
  });

  const updateVehicleApi = useApi({
    onSuccess: () => {
      router.push('/dashboard/vehicles');
      router.refresh();
    },
  });

  const loading = isEdit ? updateVehicleApi.loading : createVehicleApi.loading;
  const error = isEdit ? updateVehicleApi.error : createVehicleApi.error;

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: vehicle?.name || '',
      license_plate: vehicle?.license_plate || '',
      vin: vehicle?.vin || '',
      model: vehicle?.model || '',
      year: vehicle?.year || undefined,
      status: (vehicle?.status as any) || 'active',
      is_rental: vehicle?.is_rental || false,
      rental_start_date: vehicle?.rental_start_date || undefined,
      rental_end_date: vehicle?.rental_end_date || undefined,
      rental_monthly_price: vehicle?.rental_monthly_price || undefined,
      organization_id: undefined,
      vehicle_type_id: vehicle?.vehicle_type_id || undefined,
    },
  });

  // Watch is_rental to show/hide rental fields
  const isRental = watch('is_rental');
  const selectedStatus = watch('status');
  const selectedOrgId = watch('organization_id');
  const selectedVehicleTypeId = watch('vehicle_type_id');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files);

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreview(previews);
  };

  const onSubmit = async (data: VehicleFormData) => {
    // Подготовка FormData для отправки на сервер
    const formData = new FormData();

    // Добавляем текстовые поля
    formData.append('name', data.name);
    formData.append('license_plate', data.license_plate || '');
    formData.append('vin', data.vin || '');
    formData.append('model', data.model || '');
    formData.append('year', data.year?.toString() || '');
    formData.append('status', data.status);
    formData.append('is_rental', data.is_rental ? 'true' : 'false');
    formData.append('rental_monthly_price', data.rental_monthly_price?.toString() || '');
    formData.append('rental_start_date', data.rental_start_date || '');
    formData.append('rental_end_date', data.rental_end_date || '');

    // Добавляем vehicle_type_id если выбран
    if (data.vehicle_type_id) {
      formData.append('vehicle_type_id', data.vehicle_type_id);
    }

    // Для Super Admin - добавляем organization_id
    if (showOrgSelect && data.organization_id) {
      formData.append('organization_id', data.organization_id);
    }

    // Добавляем фотографии
    photoFiles.forEach((file) => {
      formData.append('photos', file);
    });

    if (isEdit && vehicle) {
      // Обновление существующего vehicle через PUT API
      await updateVehicleApi.execute(() =>
        fetch(`/api/vehicles/${vehicle.id}`, {
          method: 'PUT',
          body: formData,
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            return {
              error: {
                type: data.type,
                message: data.error || 'Ошибка обновления автомобиля',
                details: data.details,
                field: data.field,
              },
            };
          }
          return { data };
        })
      );
    } else {
      // Создание нового vehicle через POST API
      await createVehicleApi.post(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      {/* Organization Selection (Super Admin only) */}
      {showOrgSelect && (
        <div className="space-y-4 pb-4 border-b">
          <h2 className="text-lg font-semibold">🏢 Организация</h2>
          <OrganizationSelect
            organizations={organizations}
            value={selectedOrgId}
            onValueChange={(value) => setValue('organization_id', value)}
            error={errors.organization_id?.message}
            required={true}
          />
          <p className="text-sm text-gray-500">
            Выберите организацию, для которой создаётся автомобиль
          </p>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Основная информация</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Автомобиль-1"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="license_plate">Гос. номер *</Label>
            <Input
              id="license_plate"
              {...register('license_plate')}
              placeholder="B-AB 1234"
              className={errors.license_plate ? 'border-red-500' : ''}
            />
            {errors.license_plate && (
              <p className="text-sm text-red-600 mt-1">{errors.license_plate.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              {...register('vin')}
              placeholder="WDB9066351L123456"
              className={errors.vin ? 'border-red-500' : ''}
            />
            {errors.vin && (
              <p className="text-sm text-red-600 mt-1">{errors.vin.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="model">Модель</Label>
            <Input
              id="model"
              {...register('model')}
              placeholder="Mercedes Sprinter"
              className={errors.model ? 'border-red-500' : ''}
            />
            {errors.model && (
              <p className="text-sm text-red-600 mt-1">{errors.model.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="year">Год</Label>
            <Input
              id="year"
              type="number"
              {...register('year', { valueAsNumber: true })}
              placeholder="2020"
              className={errors.year ? 'border-red-500' : ''}
            />
            {errors.year && (
              <p className="text-sm text-red-600 mt-1">{errors.year.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Статус</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vehicle_type_id">Тип автомобиля</Label>
            <Select
              value={selectedVehicleTypeId || ''}
              onValueChange={(value) => setValue('vehicle_type_id', value || undefined)}
            >
              <SelectTrigger className={errors.vehicle_type_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не выбран</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.fuel_consumption_per_100km} л/100км)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicle_type_id && (
              <p className="text-sm text-red-600 mt-1">{errors.vehicle_type_id.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Выберите тип для отслеживания расхода топлива
            </p>
          </div>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold">📷 Фотографии автомобиля</h2>

        {vehicle?.photo_url && (
          <div className="flex gap-2 flex-wrap">
            {vehicle.photo_url.split(';').map((url, index) => (
              <div key={index} className="relative w-24 h-24">
                <Image
                  src={url}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover rounded"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <Label htmlFor="photos">
            {isEdit ? 'Добавить новые фото' : 'Выберите фото'}
          </Label>
          <Input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="cursor-pointer"
          />
          <p className="text-sm text-gray-500 mt-1">
            Можно выбрать несколько файлов (JPG, PNG, GIF)
          </p>
        </div>

        {photoPreview.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photoPreview.map((preview, index) => (
              <div key={index} className="relative w-24 h-24">
                <Image
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover rounded border-2 border-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rental Information */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold">🏢 Информация об аренде</h2>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_rental"
            {...register('is_rental')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="is_rental" className="cursor-pointer">
            Арендованный автомобиль
          </Label>
        </div>

        {isRental && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rental_start_date">Дата начала аренды *</Label>
              <Input
                id="rental_start_date"
                type="date"
                {...register('rental_start_date')}
                className={errors.rental_start_date ? 'border-red-500' : ''}
              />
              {errors.rental_start_date && (
                <p className="text-sm text-red-600 mt-1">{errors.rental_start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="rental_end_date">Дата окончания аренды</Label>
              <Input
                id="rental_end_date"
                type="date"
                {...register('rental_end_date')}
                className={errors.rental_end_date ? 'border-red-500' : ''}
              />
              {errors.rental_end_date && (
                <p className="text-sm text-red-600 mt-1">{errors.rental_end_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="rental_monthly_price">Ежемесячная стоимость (€)</Label>
              <Input
                id="rental_monthly_price"
                type="number"
                step="0.01"
                {...register('rental_monthly_price', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.rental_monthly_price ? 'border-red-500' : ''}
              />
              {errors.rental_monthly_price && (
                <p className="text-sm text-red-600 mt-1">{errors.rental_monthly_price.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Сохранение...' : isEdit ? '💾 Сохранить изменения' : '✅ Добавить автомобиль'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/vehicles')}
          disabled={loading}
        >
          ❌ Отмена
        </Button>
      </div>
    </form>
  );
}

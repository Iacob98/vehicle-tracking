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
import { uploadMultipleFiles } from '@/lib/storage';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';
import { supabase } from '@/lib/supabase/client';
import { vehicleSchema, VEHICLE_STATUS_OPTIONS, type VehicleFormData } from '@/lib/schemas';
import Image from 'next/image';

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
  };
  isEdit?: boolean;
}

export function VehicleForm({ vehicle, isEdit = false }: VehicleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

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
    },
  });

  // Watch is_rental to show/hide rental fields
  const isRental = watch('is_rental');
  const selectedStatus = watch('status');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files);

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreview(previews);
  };

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    setError('');

    console.log('🚗 Form submitted - starting vehicle creation...');

    try {
      // Get organization ID (with fallback to users table)
      console.log('🔍 Fetching organization ID...');
      const orgId = await getOrganizationIdClient();
      console.log('🏢 Organization ID received:', orgId);

      if (!orgId) {
        console.error('❌ No organization ID - throwing error');
        throw new Error(
          'Ваша сессия истекла или вы не залогинены. Пожалуйста, войдите в систему снова.'
        );
      }

      console.log('✅ Creating vehicle with org_id:', orgId);

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        photoUrls = await uploadMultipleFiles(photoFiles, 'vehicles', orgId);
      }

      // Keep existing photos if editing and no new photos
      let finalPhotoUrl: string | null = null;
      if (isEdit && vehicle?.photo_url && photoUrls.length === 0) {
        finalPhotoUrl = vehicle.photo_url;
      } else if (photoUrls.length > 0) {
        // Combine existing and new photos if editing
        if (isEdit && vehicle?.photo_url) {
          const existingUrls = vehicle.photo_url.split(';');
          finalPhotoUrl = [...existingUrls, ...photoUrls].join(';');
        } else {
          finalPhotoUrl = photoUrls.join(';');
        }
      }

      const vehicleData = {
        organization_id: orgId,
        name: data.name,
        license_plate: data.license_plate || null,
        vin: data.vin || null,
        model: data.model || null,
        year: data.year || null,
        status: data.status,
        photo_url: finalPhotoUrl,
        is_rental: data.is_rental,
        rental_monthly_price: data.rental_monthly_price || null,
        rental_start_date: data.rental_start_date || null,
        rental_end_date: data.rental_end_date || null,
      };

      if (isEdit && vehicle) {
        // Update existing vehicle
        console.log('📝 Updating existing vehicle:', vehicle.id);
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', vehicle.id)
          .eq('organization_id', orgId);

        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw updateError;
        }
        console.log('✅ Vehicle updated successfully');
      } else {
        // Create new vehicle
        console.log('➕ Creating new vehicle with data:', vehicleData);
        const { data: insertedData, error: insertError } = await supabase
          .from('vehicles')
          .insert(vehicleData)
          .select();

        if (insertError) {
          console.error('❌ Insert error:', insertError);
          throw insertError;
        }
        console.log('✅ Vehicle created successfully:', insertedData);
      }

      console.log('✅ SUCCESS! Vehicle saved. Redirecting to vehicles list...');
      router.push('/dashboard/vehicles');
      router.refresh();
    } catch (err: any) {
      console.error('❌ Error saving vehicle:', err);

      // Handle specific error cases
      let errorMessage = 'Ошибка сохранения автомобиля';

      if (err.code === '23505') {
        // Unique constraint violation
        if (err.message.includes('license_plate')) {
          errorMessage = 'Автомобиль с таким госномером уже существует в вашей организации';
        } else if (err.message.includes('vin')) {
          errorMessage = 'Автомобиль с таким VIN уже существует';
        } else {
          errorMessage = 'Автомобиль с такими данными уже существует';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('✅ Form submission completed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
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

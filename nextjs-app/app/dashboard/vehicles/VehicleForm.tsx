'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [isRental, setIsRental] = useState(vehicle?.is_rental || false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoFiles(files);

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreview(previews);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🚗 Form submitted - starting vehicle creation...');

    try {
      const formData = new FormData(e.currentTarget);
      console.log('📋 FormData created');

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
        name: formData.get('name') as string,
        license_plate: (formData.get('license_plate') as string) || null,
        vin: (formData.get('vin') as string) || null,
        model: (formData.get('model') as string) || null,
        year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
        status: (formData.get('status') as string) || 'active',
        photo_url: finalPhotoUrl,
        is_rental: formData.get('is_rental') === 'on',
        rental_monthly_price: formData.get('rental_monthly_price')
          ? parseFloat(formData.get('rental_monthly_price') as string)
          : null,
        rental_start_date: (formData.get('rental_start_date') as string) || null,
        rental_end_date: (formData.get('rental_end_date') as string) || null,
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
          errorMessage = 'Автомобиль с таким VIN уже существует в вашей организации';
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
              name="name"
              required
              defaultValue={vehicle?.name}
              placeholder="Автомобиль-1"
            />
          </div>

          <div>
            <Label htmlFor="license_plate">Гос. номер</Label>
            <Input
              id="license_plate"
              name="license_plate"
              defaultValue={vehicle?.license_plate || ''}
              placeholder="B-AB 1234"
            />
          </div>

          <div>
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              name="vin"
              defaultValue={vehicle?.vin || ''}
              placeholder="WDB9066351L123456"
            />
          </div>

          <div>
            <Label htmlFor="model">Модель</Label>
            <Input
              id="model"
              name="model"
              defaultValue={vehicle?.model || ''}
              placeholder="Mercedes Sprinter"
            />
          </div>

          <div>
            <Label htmlFor="year">Год</Label>
            <Input
              id="year"
              name="year"
              type="number"
              min="1990"
              max="2030"
              defaultValue={vehicle?.year || 2020}
            />
          </div>

          <div>
            <Label htmlFor="status">Статус</Label>
            <Select name="status" defaultValue={vehicle?.status || 'active'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">🟢 Активен</SelectItem>
                <SelectItem value="repair">🔧 Ремонт</SelectItem>
                <SelectItem value="unavailable">🔴 Недоступен</SelectItem>
                <SelectItem value="rented">🏢 Аренда</SelectItem>
              </SelectContent>
            </Select>
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
            name="is_rental"
            defaultChecked={vehicle?.is_rental || false}
            onChange={(e) => setIsRental(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="is_rental" className="cursor-pointer">
            Арендованный автомобиль
          </Label>
        </div>

        {isRental && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rental_start_date">Дата начала аренды</Label>
              <Input
                id="rental_start_date"
                name="rental_start_date"
                type="date"
                defaultValue={vehicle?.rental_start_date || ''}
              />
            </div>

            <div>
              <Label htmlFor="rental_end_date">Дата окончания аренды</Label>
              <Input
                id="rental_end_date"
                name="rental_end_date"
                type="date"
                defaultValue={vehicle?.rental_end_date || ''}
              />
            </div>

            <div>
              <Label htmlFor="rental_monthly_price">Ежемесячная стоимость (€)</Label>
              <Input
                id="rental_monthly_price"
                name="rental_monthly_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={vehicle?.rental_monthly_price || ''}
                placeholder="0.00"
              />
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { uploadFile } from '@/lib/storage';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';
import { supabase } from '@/lib/supabase/client';
import { penaltySchema, type PenaltyFormData } from '@/lib/schemas';

interface PenaltyFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
  }>;
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export function PenaltyForm({ vehicles, users }: PenaltyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PenaltyFormData>({
    resolver: zodResolver(penaltySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: 'open',
    },
  });

  const onSubmit = async (data: PenaltyFormData) => {
    setLoading(true);
    setError('');

    try {
      const orgId = await getOrganizationIdClient();
      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      // Upload file if selected
      let photoUrl = null;
      if (selectedFile) {
        console.log('📤 Uploading penalty photo...');
        photoUrl = await uploadFile(selectedFile, 'penalties', orgId);
        if (!photoUrl) {
          throw new Error('Ошибка загрузки файла');
        }
        console.log('✅ Photo uploaded:', photoUrl);
      }

      // Create penalty
      const { error: insertError } = await supabase.from('penalties').insert({
        organization_id: orgId,
        vehicle_id: data.vehicle_id,
        user_id: data.user_id || null,
        amount: data.amount,
        date: data.date,
        description: data.description || null,
        photo_url: photoUrl,
        status: data.status,
      });

      if (insertError) throw insertError;

      console.log('✅ Penalty created successfully');
      router.push('/dashboard/penalties');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating penalty:', err);
      setError(err.message || 'Ошибка создания штрафа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
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
          <Label htmlFor="user_id">
            👤 Пользователь / Benutzer
          </Label>
          <select
            id="user_id"
            {...register('user_id')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.user_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Не указан</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
          {errors.user_id && (
            <p className="text-sm text-red-600 mt-1">{errors.user_id.message}</p>
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

        <div className="col-span-2">
          <Label htmlFor="photo">
            📷 Файл штрафа / Strafzettel Datei
          </Label>
          <Input
            id="photo"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          {selectedFile && (
            <p className="text-sm text-green-600 mt-1">
              ✅ Выбран: {selectedFile.name}
            </p>
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
            placeholder="Дополнительная информация о штрафе..."
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Добавить штраф'}
        </Button>
        <Link href="/dashboard/penalties">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

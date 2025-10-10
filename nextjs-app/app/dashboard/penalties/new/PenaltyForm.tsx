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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostFormData('/api/penalties', {
    onSuccess: () => {
      router.push('/dashboard/penalties');
      router.refresh();
    },
  });

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
    // Подготовка FormData для отправки на сервер
    const formData = new FormData();

    formData.append('vehicle_id', data.vehicle_id);
    formData.append('user_id', data.user_id || '');
    formData.append('amount', data.amount.toString());
    formData.append('date', data.date);
    formData.append('description', data.description || '');
    formData.append('status', data.status);

    // Добавляем фото если выбрано
    if (selectedFile) {
      formData.append('photo', selectedFile);
    }

    // Отправляем через API
    await post(formData);
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { uploadFile } from '@/lib/storage';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';
import { supabase } from '@/lib/supabase/client';

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      const vehicleId = formData.get('vehicle_id') as string;
      const userId = formData.get('user_id') as string;
      const amount = formData.get('amount') as string;
      const penaltyDate = formData.get('date') as string;
      const description = formData.get('description') as string;

      if (!vehicleId || !amount || !penaltyDate) {
        setError('Заполните все обязательные поля');
        setLoading(false);
        return;
      }

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
        vehicle_id: vehicleId,
        user_id: userId || null,
        amount: parseFloat(amount),
        date: penaltyDate,
        description: description || null,
        photo_url: photoUrl,
        status: 'open',
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            🚗 Автомобиль / Fahrzeug *
          </label>
          <select
            name="vehicle_id"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите автомобиль</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.license_plate})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            👤 Пользователь / Benutzer
          </label>
          <select
            name="user_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Не указан</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            📅 Дата / Datum *
          </label>
          <Input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            💰 Сумма / Betrag (€) *
          </label>
          <Input
            type="number"
            name="amount"
            required
            step="0.01"
            min="0"
            defaultValue="100.00"
            placeholder="0.00"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">
            📷 Файл штрафа / Strafzettel Datei
          </label>
          <Input
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
          <label className="block text-sm font-medium mb-2">
            📝 Описание / Beschreibung
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Дополнительная информация о штрафе..."
          />
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

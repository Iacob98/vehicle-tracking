'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';
import { carExpenseSchema, CAR_EXPENSE_CATEGORY_OPTIONS, type CarExpenseFormData } from '@/lib/schemas';

interface CarExpenseFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
  }>;
}

export function CarExpenseForm({ vehicles }: CarExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CarExpenseFormData>({
    resolver: zodResolver(carExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      category: 'fuel',
    },
  });

  const onSubmit = async (data: CarExpenseFormData) => {
    setLoading(true);
    setError('');

    try {
      const orgId = await getOrganizationIdClient();
      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      const { error: insertError } = await supabase.from('car_expenses').insert({
        organization_id: orgId,
        vehicle_id: data.vehicle_id,
        category: data.category,
        amount: data.amount,
        date: data.date,
        description: data.description || null,
        mileage: data.mileage || null,
        maintenance_id: data.maintenance_id || null,
        receipt_url: data.receipt_url || null,
      });

      if (insertError) throw insertError;

      router.push('/dashboard/car-expenses');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating car expense:', err);
      setError(err.message || 'Ошибка создания расхода');
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

        <div className="col-span-2">
          <Label htmlFor="mileage">
            🛣️ Пробег / Kilometerstand (км)
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
            placeholder="Дополнительная информация о расходе..."
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
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

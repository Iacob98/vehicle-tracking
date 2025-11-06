'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON } from '@/lib/api-client';
import Link from 'next/link';
import { expenseSchema, EXPENSE_TYPE_OPTIONS, type ExpenseFormData } from '@/lib/schemas';

interface ExpenseFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
  }>;
}

export function ExpenseForm({ vehicles, teams }: ExpenseFormProps) {
  const router = useRouter();

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostJSON('/api/expenses', {
    onSuccess: () => {
      router.push('/dashboard/expenses');
      router.refresh();
    },
  });

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Watch expense type to show conditional fields
  const expenseType = watch('type');

  const onSubmit = async (data: ExpenseFormData) => {
    await post({
      type: data.type,
      vehicle_id: data.vehicle_id || null,
      team_id: data.team_id || null,
      amount: data.amount,
      date: data.date,
      description: data.description || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="type">
            📁 Тип расхода / Ausgabentyp *
          </Label>
          <select
            id="type"
            {...register('type')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Выберите тип</option>
            {EXPENSE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
          )}
        </div>

        {expenseType === 'vehicle' && (
          <div className="col-span-2">
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
        )}

        {expenseType === 'team' && (
          <div className="col-span-2">
            <Label htmlFor="team_id">
              👥 Бригада / Team *
            </Label>
            <select
              id="team_id"
              {...register('team_id')}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                errors.team_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Выберите бригаду</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {errors.team_id && (
              <p className="text-sm text-red-600 mt-1">{errors.team_id.message}</p>
            )}
          </div>
        )}

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
        <Link href="/dashboard/expenses">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

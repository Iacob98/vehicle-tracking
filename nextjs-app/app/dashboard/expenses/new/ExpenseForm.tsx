'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expenseType, setExpenseType] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      const type = formData.get('type') as string;
      const vehicleId = formData.get('vehicle_id') as string;
      const teamId = formData.get('team_id') as string;
      const amount = formData.get('amount') as string;
      const expenseDate = formData.get('date') as string;
      const description = formData.get('description') as string;

      if (!type || !amount || !expenseDate) {
        setError('Заполните все обязательные поля');
        setLoading(false);
        return;
      }

      if (type === 'vehicle' && !vehicleId) {
        setError('Выберите автомобиль');
        setLoading(false);
        return;
      }

      if (type === 'team' && !teamId) {
        setError('Выберите бригаду');
        setLoading(false);
        return;
      }

      const orgId = await getOrganizationIdClient();
      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      const { error: insertError } = await supabase.from('expenses').insert({
        organization_id: orgId,
        type,
        vehicle_id: type === 'vehicle' ? vehicleId : null,
        team_id: type === 'team' ? teamId : null,
        amount: parseFloat(amount),
        date: expenseDate,
        description: description || null,
      });

      if (insertError) throw insertError;

      router.push('/dashboard/expenses');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating expense:', err);
      setError(err.message || 'Ошибка создания расхода');
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
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">
            📁 Тип расхода / Ausgabentyp *
          </label>
          <select
            name="type"
            required
            value={expenseType}
            onChange={(e) => setExpenseType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Выберите тип</option>
            <option value="vehicle">🚗 На автомобиль / Fahrzeug</option>
            <option value="team">👥 На бригаду / Team</option>
          </select>
        </div>

        {expenseType === 'vehicle' && (
          <div className="col-span-2">
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
        )}

        {expenseType === 'team' && (
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              👥 Бригада / Team *
            </label>
            <select
              name="team_id"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите бригаду</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
            placeholder="0.00"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-2">
            📝 Описание / Beschreibung
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Дополнительная информация о расходе..."
          />
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

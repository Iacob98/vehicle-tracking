'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ErrorType } from '@/lib/errors';

interface FuelLimit {
  id: string;
  organization_id: string;
  fuel_card_id: string | null;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export function FuelLimitsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [limits, setLimits] = useState<FuelLimit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Загрузка текущих лимитов
  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/fuel-limits');
      const result = await response.json();

      if (response.ok && result.data?.limits) {
        setLimits(result.data.limits);
      }
    } catch (err: any) {
      setError('Не удалось загрузить текущие лимиты');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingId,
      fuel_card_id: formData.get('fuel_card_id') as string || null,
      daily_limit: parseFloat(formData.get('daily_limit') as string),
      weekly_limit: parseFloat(formData.get('weekly_limit') as string),
      monthly_limit: parseFloat(formData.get('monthly_limit') as string),
    };

    try {
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch('/api/fuel-limits', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении лимита');
      }

      setSuccess(true);
      setEditingId(null);
      setIsAddingNew(false);
      await fetchLimits();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот лимит?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/fuel-limits?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Ошибка при удалении лимита');
      }

      await fetchLimits();
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при удалении');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: FuelLimit) => {
    setEditingId(limit.id);
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
  };

  if (fetching) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Загрузка текущих лимитов...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert error={{ message: error, type: ErrorType.UNKNOWN }} />}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✓</div>
            <div>
              <h3 className="font-semibold text-green-900">
                Лимит успешно сохранён!
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Существующие лимиты */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Лимиты по заправочным картам
          </h2>
          <Button
            type="button"
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew || editingId !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            ➕ Добавить лимит
          </Button>
        </div>

        {limits.length === 0 && !isAddingNew && (
          <p className="text-gray-500 text-center py-8">
            Нет настроенных лимитов. Нажмите "Добавить лимит" для создания.
          </p>
        )}

        {limits.map((limit) => (
          <div key={limit.id} className="border rounded-lg p-4">
            {editingId === limit.id ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor={`fuel_card_id_${limit.id}`}>
                    ⛽ Номер заправочной карты
                  </Label>
                  <Input
                    id={`fuel_card_id_${limit.id}`}
                    name="fuel_card_id"
                    type="text"
                    defaultValue={limit.fuel_card_id || ''}
                    placeholder="Оставьте пустым для общего лимита организации"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Если не указано - лимит применяется ко всей организации
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`daily_limit_${limit.id}`}>📅 Дневной лимит (EUR)</Label>
                    <Input
                      id={`daily_limit_${limit.id}`}
                      name="daily_limit"
                      type="number"
                      step="0.01"
                      defaultValue={limit.daily_limit}
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`weekly_limit_${limit.id}`}>📆 Недельный лимит (EUR)</Label>
                    <Input
                      id={`weekly_limit_${limit.id}`}
                      name="weekly_limit"
                      type="number"
                      step="0.01"
                      defaultValue={limit.weekly_limit}
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`monthly_limit_${limit.id}`}>🗓️ Месячный лимит (EUR)</Label>
                    <Input
                      id={`monthly_limit_${limit.id}`}
                      name="monthly_limit"
                      type="number"
                      step="0.01"
                      defaultValue={limit.monthly_limit}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Сохранение...' : '💾 Сохранить'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">
                    {limit.fuel_card_id ? (
                      <span className="font-mono">⛽ {limit.fuel_card_id}</span>
                    ) : (
                      <span className="text-gray-600">🏢 Общий лимит организации</span>
                    )}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>📅 День: <span className="font-semibold">€{limit.daily_limit}</span></p>
                    <p>📆 Неделя: <span className="font-semibold">€{limit.weekly_limit}</span></p>
                    <p>🗓️ Месяц: <span className="font-semibold">€{limit.monthly_limit}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEdit(limit)}
                    disabled={editingId !== null || isAddingNew}
                  >
                    ✏️ Изменить
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDelete(limit.id)}
                    disabled={loading || editingId !== null || isAddingNew}
                    className="text-red-600 hover:bg-red-50"
                  >
                    🗑️ Удалить
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Форма добавления нового лимита */}
        {isAddingNew && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-4">Новый лимит</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fuel_card_id_new">
                  ⛽ Номер заправочной карты
                </Label>
                <Input
                  id="fuel_card_id_new"
                  name="fuel_card_id"
                  type="text"
                  placeholder="Оставьте пустым для общего лимита организации"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Если не указано - лимит применяется ко всей организации
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="daily_limit_new">📅 Дневной лимит (EUR)</Label>
                  <Input
                    id="daily_limit_new"
                    name="daily_limit"
                    type="number"
                    step="0.01"
                    defaultValue="400.00"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="weekly_limit_new">📆 Недельный лимит (EUR)</Label>
                  <Input
                    id="weekly_limit_new"
                    name="weekly_limit"
                    type="number"
                    step="0.01"
                    defaultValue="800.00"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="monthly_limit_new">🗓️ Месячный лимит (EUR)</Label>
                  <Input
                    id="monthly_limit_new"
                    name="monthly_limit"
                    type="number"
                    step="0.01"
                    defaultValue="1800.00"
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Создание...' : '➕ Создать лимит'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Информационный блок */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">⚠️</div>
          <div className="text-sm text-yellow-900">
            <p className="font-semibold mb-1">Как работают лимиты:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Каждая заправочная карта может иметь свой лимит</li>
              <li>Если для карты не настроен лимит, применяется общий лимит организации</li>
              <li>Система НЕ блокирует заправку при превышении лимита</li>
              <li>Водитель видит предупреждение, но может продолжить</li>
              <li>Все превышения сохраняются для анализа менеджментом</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

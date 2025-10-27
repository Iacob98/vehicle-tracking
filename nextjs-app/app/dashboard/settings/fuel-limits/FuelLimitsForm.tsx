'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';

const fuelLimitsSchema = z.object({
  daily_limit: z
    .number()
    .positive('Дневной лимит должен быть положительным')
    .max(999999, 'Слишком большое значение'),
  weekly_limit: z
    .number()
    .positive('Недельный лимит должен быть положительным')
    .max(999999, 'Слишком большое значение'),
  monthly_limit: z
    .number()
    .positive('Месячный лимит должен быть положительным')
    .max(999999, 'Слишком большое значение'),
});

type FuelLimitsFormData = z.infer<typeof fuelLimitsSchema>;

export function FuelLimitsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FuelLimitsFormData>({
    resolver: zodResolver(fuelLimitsSchema),
    defaultValues: {
      daily_limit: 400,
      weekly_limit: 800,
      monthly_limit: 1800,
    },
  });

  // Загрузка текущих лимитов при монтировании
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch('/api/fuel-limits');
        const result = await response.json();

        if (response.ok && result.data?.limits) {
          const limits = result.data.limits;
          setValue('daily_limit', Number(limits.daily_limit));
          setValue('weekly_limit', Number(limits.weekly_limit));
          setValue('monthly_limit', Number(limits.monthly_limit));
        }
      } catch (err: any) {
        setError('Не удалось загрузить текущие лимиты');
      } finally {
        setFetching(false);
      }
    };

    fetchLimits();
  }, [setValue]);

  const onSubmit = async (data: FuelLimitsFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/fuel-limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении лимитов');
      }

      setSuccess(true);
      router.refresh();

      // Убираем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorAlert error={{ message: error, type: 'UNKNOWN' }} />}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✓</div>
            <div>
              <h3 className="font-semibold text-green-900">
                Лимиты успешно обновлены!
              </h3>
              <p className="text-sm text-green-700">
                Новые лимиты будут применяться для всех последующих заправок.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Настройка лимитов
        </h2>

        {/* Дневной лимит */}
        <div>
          <Label htmlFor="daily_limit">📅 Дневной лимит (EUR) *</Label>
          <Input
            id="daily_limit"
            type="number"
            step="0.01"
            placeholder="400.00"
            {...register('daily_limit', { valueAsNumber: true })}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Максимальная сумма расхода топлива в день
          </p>
          {errors.daily_limit && (
            <p className="text-red-500 text-sm mt-1">
              {errors.daily_limit.message}
            </p>
          )}
        </div>

        {/* Недельный лимит */}
        <div>
          <Label htmlFor="weekly_limit">📆 Недельный лимит (EUR) *</Label>
          <Input
            id="weekly_limit"
            type="number"
            step="0.01"
            placeholder="800.00"
            {...register('weekly_limit', { valueAsNumber: true })}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Максимальная сумма расхода топлива в неделю (с понедельника по воскресенье)
          </p>
          {errors.weekly_limit && (
            <p className="text-red-500 text-sm mt-1">
              {errors.weekly_limit.message}
            </p>
          )}
        </div>

        {/* Месячный лимит */}
        <div>
          <Label htmlFor="monthly_limit">🗓️ Месячный лимит (EUR) *</Label>
          <Input
            id="monthly_limit"
            type="number"
            step="0.01"
            placeholder="1800.00"
            {...register('monthly_limit', { valueAsNumber: true })}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Максимальная сумма расхода топлива в месяц
          </p>
          {errors.monthly_limit && (
            <p className="text-red-500 text-sm mt-1">
              {errors.monthly_limit.message}
            </p>
          )}
        </div>
      </div>

      {/* Предупреждение */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">⚠️</div>
          <div className="text-sm text-yellow-900">
            <p className="font-semibold mb-1">Важно:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Лимиты проверяются только для категории "топливо"</li>
              <li>Система НЕ блокирует заправку при превышении лимита</li>
              <li>Водитель видит предупреждение, но может продолжить</li>
              <li>Все превышения сохраняются для анализа менеджментом</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Сохранение...' : '💾 Сохранить лимиты'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex-1"
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';

const fuelCardSchema = z.object({
  fuel_card_id: z
    .string()
    .max(50, 'Номер карты слишком длинный (максимум 50 символов)')
    .optional()
    .or(z.literal('')),
});

type FuelCardFormData = z.infer<typeof fuelCardSchema>;

interface FuelCardFormProps {
  userId: string;
  currentFuelCardId: string;
}

export function FuelCardForm({ userId, currentFuelCardId }: FuelCardFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FuelCardFormData>({
    resolver: zodResolver(fuelCardSchema),
    defaultValues: {
      fuel_card_id: currentFuelCardId,
    },
  });

  const onSubmit = async (data: FuelCardFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fuel_card_id: data.fuel_card_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при сохранении данных');
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <ErrorAlert error={{ message: error, type: 'UNKNOWN' }} />}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✓</div>
            <div>
              <h3 className="font-semibold text-green-900">
                Данные успешно обновлены!
              </h3>
              <p className="text-sm text-green-700">
                Номер заправочной карты сохранен.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="fuel_card_id">🔢 Номер заправочной карты</Label>
        <Input
          id="fuel_card_id"
          type="text"
          placeholder="Например: 1234-5678-9012"
          {...register('fuel_card_id')}
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          Введите номер вашей заправочной карты (необязательно)
        </p>
        {errors.fuel_card_id && (
          <p className="text-red-500 text-sm mt-1">
            {errors.fuel_card_id.message}
          </p>
        )}
      </div>

      {currentFuelCardId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            <strong>Текущий номер карты:</strong> {currentFuelCardId}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Сохранение...' : '💾 Сохранить'}
        </Button>
        {currentFuelCardId && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const form = document.querySelector('form');
              const input = form?.querySelector('input[name="fuel_card_id"]') as HTMLInputElement;
              if (input) input.value = '';
            }}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Удалить номер карты
          </Button>
        )}
      </div>
    </form>
  );
}

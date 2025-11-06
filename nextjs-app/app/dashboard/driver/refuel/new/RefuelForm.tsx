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
import { ErrorType } from '@/lib/errors';
import Link from 'next/link';

// Создаем функцию для создания схемы с динамической валидацией одометра
const createRefuelSchema = (minOdometer: number | null) => z.object({
  date: z.string().min(1, 'Дата обязательна'),
  amount: z
    .number()
    .positive('Сумма должна быть положительной')
    .max(999999.99, 'Сумма слишком большая'),
  liters: z
    .number()
    .positive('Количество литров должно быть положительным')
    .max(999.99, 'Количество литров слишком большое'),
  odometer: z
    .string()
    .min(1, 'Показания одометра обязательны')
    .regex(/^\d+$/, 'Введите только цифры')
    .refine(
      (val) => {
        if (minOdometer === null) return true;
        const numVal = parseInt(val);
        return numVal > minOdometer;
      },
      {
        message: minOdometer !== null
          ? `Показания одометра должны быть больше ${minOdometer} км`
          : 'Введите корректные показания',
      }
    ),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
});

type RefuelFormData = z.infer<ReturnType<typeof createRefuelSchema>>;

interface RefuelFormProps {
  vehicleId: string;
  vehicleName: string;
  fuelCardId: string | null;
  lastOdometerReading: number | null;
}

export function RefuelForm({ vehicleId, vehicleName, fuelCardId, lastOdometerReading }: RefuelFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RefuelFormData>({
    resolver: zodResolver(createRefuelSchema(lastOdometerReading)),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      odometer: lastOdometerReading !== null ? lastOdometerReading.toString() : '',
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Создаем preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: RefuelFormData) => {
    if (!selectedFile) {
      setError('Необходимо загрузить фото чека');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('vehicle_id', vehicleId);
      formData.append('category', 'fuel');
      formData.append('amount', data.amount.toString());
      formData.append('liters', data.liters.toString());
      formData.append('odometer_reading', data.odometer);
      formData.append('date', data.date);
      formData.append('description', data.description || '');
      formData.append('receipt', selectedFile);
      if (fuelCardId) {
        formData.append('fuel_card_id', fuelCardId);
      }

      const response = await fetch('/api/car-expenses', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при добавлении заправки');
      }

      // Проверяем наличие предупреждений о лимитах
      if (result.data?.warnings && result.data.warnings.length > 0) {
        setWarnings(result.data.warnings);
        // Даем пользователю 5 секунд посмотреть предупреждения
        setTimeout(() => {
          router.push('/dashboard/driver/refuel');
          router.refresh();
        }, 5000);
      } else {
        // Успех без предупреждений - перенаправляем сразу
        router.push('/dashboard/driver/refuel');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <ErrorAlert error={{ message: error, type: ErrorType.UNKNOWN }} />}

      {/* Предупреждения о лимитах */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 text-lg">
                Превышен лимит расхода топлива!
              </h3>
              <div className="mt-2 space-y-1">
                {warnings.map((warning, idx) => (
                  <p key={idx} className="text-yellow-800 text-sm">
                    {warning}
                  </p>
                ))}
              </div>
              <p className="text-sm text-yellow-700 mt-3">
                ✓ Заправка добавлена успешно. Перенаправление через 5 секунд...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Информация об автомобиле */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm font-medium text-green-900">
          🚗 Автомобиль: <span className="font-bold">{vehicleName}</span>
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        {/* Дата */}
        <div>
          <Label htmlFor="date">📅 Дата заправки *</Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className="mt-1"
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.date && (
            <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
          )}
        </div>

        {/* Сумма */}
        <div>
          <Label htmlFor="amount">💰 Сумма расхода (EUR) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="50.00"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1"
          />
          {errors.amount && (
            <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Литры */}
        <div>
          <Label htmlFor="liters">⛽ Количество литров *</Label>
          <Input
            id="liters"
            type="number"
            step="0.01"
            placeholder="35.50"
            {...register('liters', { valueAsNumber: true })}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Введите количество заправленных литров топлива
          </p>
          {errors.liters && (
            <p className="text-red-500 text-sm mt-1">{errors.liters.message}</p>
          )}
        </div>

        {/* Показания одометра */}
        <div>
          <Label htmlFor="odometer">📊 Показания одометра (км) *</Label>
          {lastOdometerReading !== null && (
            <div className="mb-2 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              <p className="text-sm text-blue-900">
                ℹ️ Последнее показание: <span className="font-bold">{lastOdometerReading} км</span>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Новое значение должно быть больше {lastOdometerReading} км
              </p>
            </div>
          )}
          <Input
            id="odometer"
            type="text"
            placeholder={lastOdometerReading !== null ? `> ${lastOdometerReading}` : "45320"}
            {...register('odometer')}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Введите текущий пробег автомобиля в километрах
          </p>
          {errors.odometer && (
            <p className="text-red-500 text-sm mt-1">{errors.odometer.message}</p>
          )}
        </div>

        {/* Фото чека */}
        <div>
          <Label htmlFor="receipt">📷 Фото чека *</Label>
          <Input
            id="receipt"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Загрузите фото чека с заправки (обязательно)
          </p>
          {!selectedFile && (
            <p className="text-orange-600 text-sm mt-1">
              ⚠️ Необходимо загрузить фото чека
            </p>
          )}

          {/* Preview фото */}
          {filePreview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Предпросмотр:
              </p>
              <img
                src={filePreview}
                alt="Preview чека"
                className="max-w-xs rounded-lg border shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview(null);
                  const input = document.getElementById('receipt') as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="text-sm text-red-600 hover:text-red-700 mt-2"
              >
                Удалить фото
              </button>
            </div>
          )}
        </div>

        {/* Примечание */}
        <div>
          <Label htmlFor="description">📝 Примечание (опционально)</Label>
          <textarea
            id="description"
            {...register('description')}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Например: Полный бак, заправка на трассе и т.д."
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Сохранение...' : '✓ Добавить заправку'}
        </Button>
        <Link
          href="/dashboard/driver"
          className="flex-1 px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Отмена
        </Link>
      </div>

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">ℹ️</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Инструкция:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Укажите дату заправки</li>
              <li>Введите сумму расхода в евро</li>
              <li>Введите количество литров топлива</li>
              <li>Введите показания одометра (пробег)</li>
              <li>Обязательно загрузите фото чека</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}

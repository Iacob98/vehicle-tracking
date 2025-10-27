'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface DriverPaymentFormProps {
  penaltyId: string;
  amount: number;
}

export default function DriverPaymentForm({ penaltyId, amount }: DriverPaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReceiptFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!receiptFile) {
      alert('❌ Необходимо загрузить фото чека об оплате!');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('penalty_id', penaltyId);
      formData.append('file', receiptFile);
      if (notes) {
        formData.append('payment_notes', notes);
      }

      const response = await fetch('/api/penalties/pay', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при обработке оплаты');
      }

      alert('✅ Штраф отмечен как оплаченный!');
      router.push('/dashboard/driver/penalties');
      router.refresh();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(error.message || 'Ошибка при обработке оплаты');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">💳 Отметить как оплаченный</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💰 Сумма штрафа: <strong>{amount.toFixed(2)} €</strong>
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Обязательно прикрепите фото чека об оплате</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📷 Фото чека об оплате *
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Обязательное поле. Поддерживаются форматы: JPG, PNG, PDF
          </p>
        </div>

        {/* Photo preview */}
        {previewUrl && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Предварительный просмотр:</p>
            <div className="relative h-64 w-full">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 Примечания (необязательно)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Дополнительная информация об оплате..."
          />
          <p className="text-xs text-gray-500 mt-1">Максимум 500 символов</p>
        </div>

        {/* Submit button */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !receiptFile}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Обработка...' : '💳 Подтвердить оплату'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

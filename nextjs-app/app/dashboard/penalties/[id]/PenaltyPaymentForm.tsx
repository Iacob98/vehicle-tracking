'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PenaltyPaymentFormProps {
  penaltyId: string;
  amount: number;
  orgId: string;
}

export default function PenaltyPaymentForm({ penaltyId, amount, orgId }: PenaltyPaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!receiptFile) {
      alert('❌ Необходимо загрузить фото чека! / Receipt photo required!');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('penalty_id', penaltyId);
    formData.append('file', receiptFile);

    try {
      const response = await fetch('/api/penalties/pay', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payment');
      }

      alert('✅ Штраф отмечен как оплаченный! / Penalty marked as paid!');
      router.refresh();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(error.message || 'Ошибка при обработке оплаты');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">💳 Отметить как оплаченный / Als bezahlt markieren</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">💰 Сумма штрафа: <strong>€{amount.toFixed(2)}</strong></p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Обязательно прикрепите чек об оплате</strong> / Receipt photo required
        </p>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            📄 Загрузите фото чека / Upload receipt photo *
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Обязательное поле для подтверждения оплаты / Mandatory field to confirm payment
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            📝 Примечания к оплате / Payment notes
          </label>
          <textarea
            name="payment_notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Дополнительная информация об оплате..."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading || !receiptFile}>
            {loading ? 'Обработка...' : '💳 Подтвердить оплату / Confirm Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
}

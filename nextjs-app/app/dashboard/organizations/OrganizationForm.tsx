'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePostJSON, usePutJSON } from '@/lib/api-client';
import { createOrganizationSchema, updateOrganizationSchema } from '@/lib/schemas/organizations.schema';
import type { z } from 'zod';

type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

interface OrganizationFormProps {
  organization?: {
    id: string;
    name: string;
    telegram_chat_id: string | null;
    subscription_status: 'active' | 'inactive' | 'suspended' | 'trial';
    subscription_expires_at: string | null;
  };
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter();
  const isEditing = !!organization;

  const [formData, setFormData] = useState<CreateOrganizationInput>({
    name: organization?.name || '',
    telegram_chat_id: organization?.telegram_chat_id || '',
    subscription_status: organization?.subscription_status || 'active',
    subscription_expires_at: organization?.subscription_expires_at || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { post, loading: postLoading, error: postError } = usePostJSON('/api/organizations', {
    onSuccess: () => {
      router.push('/dashboard/organizations');
      router.refresh();
    },
  });

  const { put, loading: putLoading, error: putError } = usePutJSON(
    `/api/organizations/${organization?.id}`,
    {
      onSuccess: () => {
        router.push('/dashboard/organizations');
        router.refresh();
      },
    }
  );

  const loading = postLoading || putLoading;
  const error = postError || putError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Client-side validation
    const schema = isEditing ? updateOrganizationSchema : createOrganizationSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    // Prepare data for submission
    const submitData: any = { ...formData };

    // Convert empty strings to null
    if (!submitData.telegram_chat_id) submitData.telegram_chat_id = null;
    if (!submitData.subscription_expires_at) submitData.subscription_expires_at = null;

    if (isEditing) {
      await put(submitData as UpdateOrganizationInput);
    } else {
      await post(submitData as CreateOrganizationInput);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-lg p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Название организации <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Фирма А"
          required
        />
        {validationErrors.name && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
        )}
      </div>

      {/* Telegram Chat ID */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Telegram Chat ID
        </label>
        <input
          type="text"
          value={formData.telegram_chat_id || ''}
          onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="-1001234567890"
        />
        <p className="text-sm text-gray-500 mt-1">
          ID чата Telegram для отправки уведомлений (необязательно)
        </p>
        {validationErrors.telegram_chat_id && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.telegram_chat_id}</p>
        )}
      </div>

      {/* Subscription Status */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Статус подписки <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.subscription_status}
          onChange={(e) =>
            setFormData({
              ...formData,
              subscription_status: e.target.value as 'active' | 'inactive' | 'suspended' | 'trial',
            })
          }
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="active">Активна</option>
          <option value="trial">Пробный период</option>
          <option value="inactive">Неактивна</option>
          <option value="suspended">Приостановлена</option>
        </select>
        {validationErrors.subscription_status && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.subscription_status}</p>
        )}
      </div>

      {/* Subscription Expires At */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Дата окончания подписки
        </label>
        <input
          type="date"
          value={
            formData.subscription_expires_at
              ? new Date(formData.subscription_expires_at).toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              subscription_expires_at: e.target.value
                ? new Date(e.target.value).toISOString()
                : '',
            })
          }
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-sm text-gray-500 mt-1">
          Дата, до которой действует подписка (необязательно)
        </p>
        {validationErrors.subscription_expires_at && (
          <p className="text-red-500 text-sm mt-1">{validationErrors.subscription_expires_at}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : isEditing ? '💾 Сохранить изменения' : '➕ Создать организацию'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

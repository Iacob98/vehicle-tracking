'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON } from '@/lib/api-client';
import Link from 'next/link';
import { teamSchema, type TeamFormData } from '@/lib/schemas';

interface TeamFormProps {
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  }>;
}

export function TeamForm({ users }: TeamFormProps) {
  const router = useRouter();

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostJSON('/api/teams', {
    onSuccess: () => {
      router.push('/dashboard/teams');
      router.refresh();
    },
  });

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  const onSubmit = async (data: TeamFormData) => {
    await post({
      name: data.name,
      description: data.description || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      <div>
        <Label htmlFor="name">
          Название бригады *
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Введите название бригады"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">
          Описание
        </Label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Краткое описание бригады (необязательно)"
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Создать бригаду'}
        </Button>
        <Link href="/dashboard/teams">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

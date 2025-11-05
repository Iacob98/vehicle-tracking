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
import { OrganizationSelect } from '@/components/OrganizationSelect';

// User type definition (client-safe)
type UserRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'driver';

interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  organization_id: string | null;
  phone?: string;
  created_at?: string;
}

// Client-side Super Admin check
function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

interface Organization {
  id: string;
  name: string;
}

interface TeamFormProps {
  users: Array<{
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  }>;
  currentUser: User;
  organizations?: Organization[];
}

export function TeamForm({ users, currentUser, organizations = [] }: TeamFormProps) {
  const router = useRouter();
  const showOrgSelect = isSuperAdmin(currentUser);

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
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      organization_id: undefined,
    },
  });

  const selectedOrgId = watch('organization_id');

  const onSubmit = async (data: TeamFormData) => {
    const submitData: any = {
      name: data.name,
    };

    // Для Super Admin - добавляем organization_id
    if (showOrgSelect && data.organization_id) {
      submitData.organization_id = data.organization_id;
    }

    await post(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      {error && <ErrorAlert error={error} />}

      {/* Organization Selection (Super Admin only) */}
      {showOrgSelect && (
        <div className="space-y-4 pb-4 border-b">
          <h2 className="text-lg font-semibold">🏢 Организация</h2>
          <OrganizationSelect
            organizations={organizations}
            value={selectedOrgId}
            onValueChange={(value) => setValue('organization_id', value)}
            error={errors.organization_id?.message}
            required={true}
          />
          <p className="text-sm text-gray-500">
            Выберите организацию, для которой создаётся бригада
          </p>
        </div>
      )}

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

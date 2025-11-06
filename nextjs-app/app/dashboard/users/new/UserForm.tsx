'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON } from '@/lib/api-client';
import Link from 'next/link';
import { createUserSchema, type CreateUserFormData } from '@/lib/schemas/users.schema';
import { ROLE_OPTIONS } from '@/lib/types/roles';
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

interface UserFormProps {
  teams: Array<{
    id: string;
    name: string;
  }>;
  currentUser: User;
  organizations?: Organization[];
}

export function UserForm({ teams, currentUser, organizations = [] }: UserFormProps) {
  const router = useRouter();
  const showOrgSelect = isSuperAdmin(currentUser);

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostJSON('/api/users', {
    onSuccess: () => {
      router.push('/dashboard/users');
      router.refresh();
    },
  });

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'viewer' as const,
      phone: '',
      organization_id: undefined,
    } as Partial<CreateUserFormData>,
  });

  const selectedOrgId = watch('organization_id');

  const onSubmit = async (data: CreateUserFormData) => {
    // Для Super Admin:
    // - owner/admin БЕЗ organization_id = супер-админ (может видеть все организации)
    // - manager/viewer/driver ТРЕБУЮТ organization_id
    if (showOrgSelect && !data.organization_id) {
      // Проверяем, что для ролей кроме owner/admin требуется организация
      if (data.role !== 'owner' && data.role !== 'admin') {
        setError('organization_id', {
          type: 'manual',
          message: 'Организация обязательна для ролей manager, viewer и driver',
        });
        return;
      }
      // Для owner/admin без организации - это нормально (супер-админ)
    }

    const submitData: any = {
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      phone: data.phone || null,
    };

    // Для Super Admin - добавляем organization_id если он выбран
    if (showOrgSelect && data.organization_id) {
      submitData.organization_id = data.organization_id;
    } else if (showOrgSelect && !data.organization_id) {
      // Явно устанавливаем NULL для супер-админа
      submitData.organization_id = null;
    }

    // Для обычных админов/менеджеров - добавляем их organization_id
    if (!showOrgSelect && currentUser.organization_id) {
      submitData.organization_id = currentUser.organization_id;
    }

    await post(submitData);
  };

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          🔐 Добавленные пользователи получат полный доступ к данным вашей организации
        </p>
      </div>

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
              required={false}
            />
            <p className="text-sm text-gray-500">
              Выберите организацию для пользователя. Оставьте пустым для создания супер-админа (owner/admin с доступом ко всем организациям)
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="user@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">
              Пароль *
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Минимум 8 символов"
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">
              Подтверждение пароля *
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              placeholder="Повторите пароль"
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">
              Роль в системе *
            </Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {ROLE_OPTIONS.find((r) => r.value === 'admin')?.description}
            </p>
          </div>

          <div>
            <Label htmlFor="first_name">
              Имя *
            </Label>
            <Input
              id="first_name"
              {...register('first_name')}
              placeholder="Иван"
              className={errors.first_name ? 'border-red-500' : ''}
            />
            {errors.first_name && (
              <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="last_name">
              Фамилия *
            </Label>
            <Input
              id="last_name"
              {...register('last_name')}
              placeholder="Иванов"
              className={errors.last_name ? 'border-red-500' : ''}
            />
            {errors.last_name && (
              <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">
              Телефон
            </Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+7 900 123-45-67"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Сохранение...' : '👥 Добавить пользователя'}
          </Button>
          <Link href="/dashboard/users">
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </>
  );
}

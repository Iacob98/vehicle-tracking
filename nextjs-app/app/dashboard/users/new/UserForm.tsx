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

interface UserFormProps {
  teams: Array<{
    id: string;
    name: string;
  }>;
}

export function UserForm({ teams }: UserFormProps) {
  const router = useRouter();

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
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'viewer' as const,
      position: '',
      phone: '',
    } as Partial<CreateUserFormData>,
  });

  const onSubmit = async (data: CreateUserFormData) => {
    await post({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role,
      phone: data.phone || null,
      position: data.position || null,
    });
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

          <div>
            <Label htmlFor="position">
              Должность
            </Label>
            <Input
              id="position"
              {...register('position')}
              placeholder="Водитель"
              className={errors.position ? 'border-red-500' : ''}
            />
            {errors.position && (
              <p className="text-sm text-red-600 mt-1">{errors.position.message}</p>
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

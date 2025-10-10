'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';
import { createUserSchema } from '@/lib/schemas';
import { z } from 'zod';

type UserFormData = z.infer<typeof createUserSchema>;

interface UserFormProps {
  teams: Array<{
    id: string;
    name: string;
  }>;
}

export function UserForm({ teams }: UserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Setup react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      position: '',
      phone: '',
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    setError('');

    try {
      const orgId = await getOrganizationIdClient();
      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      // Hash password (simple SHA256 - matching existing implementation)
      const crypto = require('crypto');
      const passwordHash = crypto
        .createHash('sha256')
        .update(data.password + 'fleet_management_salt_2025')
        .digest('hex');

      const { error: insertError } = await supabase.from('users').insert({
        organization_id: orgId,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        position: data.position || null,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505' && insertError.message.includes('email')) {
          throw new Error('Пользователь с таким email уже существует в вашей организации');
        }
        throw insertError;
      }

      router.push('/dashboard/users');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          🔐 Добавленные пользователи получат полный доступ к данным вашей организации
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
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

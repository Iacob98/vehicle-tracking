'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON } from '@/lib/api-client';
import { createDriverSchema, type CreateDriverFormData } from '@/lib/schemas/users.schema';
import { Permissions, type UserRole } from '@/lib/types/roles';
import Link from 'next/link';

interface TeamUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  fuel_card_id?: string;
}

interface TeamDriversProps {
  teamId: string;
  orgId: string;
  userRole: UserRole;
  initialUsers: TeamUser[];
}

export default function TeamDrivers({ teamId, orgId, userRole, initialUsers }: TeamDriversProps) {
  const router = useRouter();
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [showAddForm, setShowAddForm] = useState(false);

  const { loading, error, post } = usePostJSON('/api/users', {
    onSuccess: (data) => {
      if (data?.user) {
        setUsers([...users, data.user]);
      }
      setShowAddForm(false);
      reset();
      router.refresh();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDriverFormData>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: {
      phone: '',
      fuel_card_id: '',
    },
  });

  const onSubmit = async (data: CreateDriverFormData) => {
    await post({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      role: 'driver',
      phone: data.phone || null,
      fuel_card_id: data.fuel_card_id || null,
      team_id: teamId,
      organization_id: orgId,
    });
  };

  const canAdd = Permissions.canCreateDrivers(userRole);

  return (
    <div className="space-y-4">
      {error && <ErrorAlert error={error} />}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Пользователи бригады</h2>
        {canAdd && (
          <Button onClick={() => { setShowAddForm(!showAddForm); if (showAddForm) reset(); }}>
            {showAddForm ? 'Отмена' : '+ Добавить водителя'}
          </Button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-lg">Новый водитель</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="driver_first_name">Имя *</Label>
              <Input
                id="driver_first_name"
                {...register('first_name')}
                placeholder="Иван"
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="driver_last_name">Фамилия *</Label>
              <Input
                id="driver_last_name"
                {...register('last_name')}
                placeholder="Иванов"
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="driver_email">Email *</Label>
              <Input
                id="driver_email"
                type="email"
                {...register('email')}
                placeholder="driver@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="driver_phone">Телефон</Label>
              <Input
                id="driver_phone"
                {...register('phone')}
                placeholder="+7 900 123-45-67"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="driver_password">Пароль *</Label>
              <Input
                id="driver_password"
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
              <Label htmlFor="driver_confirmPassword">Подтверждение пароля *</Label>
              <Input
                id="driver_confirmPassword"
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
              <Label htmlFor="driver_fuel_card">Топливная карта</Label>
              <Input
                id="driver_fuel_card"
                {...register('fuel_card_id')}
                placeholder="Номер карты"
                className={errors.fuel_card_id ? 'border-red-500' : ''}
              />
              {errors.fuel_card_id && (
                <p className="text-sm text-red-600 mt-1">{errors.fuel_card_id.message}</p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать водителя'}
          </Button>
        </form>
      )}

      {users && users.length > 0 ? (
        <div className="bg-white border rounded-lg divide-y">
          {users.map((u) => (
            <div key={u.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{u.first_name} {u.last_name}</h3>
                  <p className="text-sm text-gray-600">{u.email}</p>
                  <p className="text-sm text-gray-500">Роль: {u.role}</p>
                  {u.fuel_card_id && (
                    <p className="text-sm text-gray-500">Топливная карта: {u.fuel_card_id}</p>
                  )}
                </div>
                <Link href={`/dashboard/users/${u.id}`}>
                  <Button variant="outline" size="sm">Просмотр</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500">Нет пользователей в этой бригаде</p>
          {canAdd && (
            <Button className="mt-4" onClick={() => setShowAddForm(true)}>
              + Добавить первого водителя
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

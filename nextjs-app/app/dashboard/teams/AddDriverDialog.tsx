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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AddDriverDialogProps {
  teamId: string;
  teamName: string;
  orgId: string;
}

export default function AddDriverDialog({ teamId, teamName, orgId }: AddDriverDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { loading, error, post, clearError } = usePostJSON('/api/users', {
    onSuccess: () => {
      setOpen(false);
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      clearError();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title={`Добавить водителя в ${teamName}`}>
          +
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить водителя в &laquo;{teamName}&raquo;</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <ErrorAlert error={error} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`dlg_first_name_${teamId}`}>Имя *</Label>
              <Input
                id={`dlg_first_name_${teamId}`}
                {...register('first_name')}
                placeholder="Иван"
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor={`dlg_last_name_${teamId}`}>Фамилия *</Label>
              <Input
                id={`dlg_last_name_${teamId}`}
                {...register('last_name')}
                placeholder="Иванов"
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor={`dlg_email_${teamId}`}>Email *</Label>
            <Input
              id={`dlg_email_${teamId}`}
              type="email"
              {...register('email')}
              placeholder="driver@example.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`dlg_password_${teamId}`}>Пароль *</Label>
              <Input
                id={`dlg_password_${teamId}`}
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
              <Label htmlFor={`dlg_confirm_${teamId}`}>Подтверждение *</Label>
              <Input
                id={`dlg_confirm_${teamId}`}
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
              <Label htmlFor={`dlg_phone_${teamId}`}>Телефон</Label>
              <Input
                id={`dlg_phone_${teamId}`}
                {...register('phone')}
                placeholder="+7 900 123-45-67"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor={`dlg_fuel_${teamId}`}>Топливная карта</Label>
              <Input
                id={`dlg_fuel_${teamId}`}
                {...register('fuel_card_id')}
                placeholder="Номер карты"
                className={errors.fuel_card_id ? 'border-red-500' : ''}
              />
              {errors.fuel_card_id && (
                <p className="text-sm text-red-600 mt-1">{errors.fuel_card_id.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать водителя'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

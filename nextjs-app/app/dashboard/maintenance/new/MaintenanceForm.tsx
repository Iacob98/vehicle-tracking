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
import { maintenanceSchema, MAINTENANCE_TYPE_OPTIONS, type MaintenanceFormData } from '@/lib/schemas/maintenance.schema';
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

interface MaintenanceFormProps {
  vehicles: Array<{
    id: string;
    name: string;
    license_plate: string;
  }>;
  currentUser: User;
  organizations?: Organization[];
}

export function MaintenanceForm({ vehicles, currentUser, organizations = [] }: MaintenanceFormProps) {
  const router = useRouter();
  const showOrgSelect = isSuperAdmin(currentUser);

  // Используем централизованную обработку ошибок через API hooks
  const { loading, error, post } = usePostJSON('/api/maintenance', {
    onSuccess: () => {
      router.push('/dashboard/maintenance');
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
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      type: 'inspection',
      organization_id: undefined,
    },
  });

  const selectedOrgId = watch('organization_id');

  const onSubmit = async (data: MaintenanceFormData) => {
    const submitData: any = {
      vehicle_id: data.vehicle_id,
      type: data.type,
      date: data.date,
      description: data.description || null,
    };

    // Для Super Admin - добавляем выбранный organization_id из формы
    if (showOrgSelect && data.organization_id) {
      submitData.organization_id = data.organization_id;
    }
    // Для обычного admin/manager - добавляем их organization_id
    else if (currentUser.organization_id) {
      submitData.organization_id = currentUser.organization_id;
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
            Выберите организацию, для которой создаётся обслуживание
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vehicle_id">
            🚗 Автомобиль / Fahrzeug *
          </Label>
          <select
            id="vehicle_id"
            {...register('vehicle_id')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.vehicle_id ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Выберите автомобиль</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.license_plate})
              </option>
            ))}
          </select>
          {errors.vehicle_id && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicle_id.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="type">
            🔧 Тип обслуживания / Wartungstyp *
          </Label>
          <select
            id="type"
            {...register('type')}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {MAINTENANCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="date">
            📅 Дата / Datum *
          </Label>
          <Input
            id="date"
            type="date"
            {...register('date')}
            className={errors.date ? 'border-red-500' : ''}
          />
          {errors.date && (
            <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">
            📝 Описание / Beschreibung
          </Label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Описание работ, замененные детали..."
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Добавить обслуживание'}
        </Button>
        <Link href="/dashboard/maintenance">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

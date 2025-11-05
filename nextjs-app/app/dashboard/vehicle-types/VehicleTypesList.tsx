'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteJSON } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';

interface VehicleType {
  id: string;
  organization_id: string;
  name: string;
  fuel_consumption_per_100km: number;
  tank_capacity: number | null;
  created_at: string;
  updated_at: string;
}

interface VehicleTypesListProps {
  vehicleTypes: VehicleType[];
  isSuperAdmin: boolean;
}

export function VehicleTypesList({ vehicleTypes, isSuperAdmin }: VehicleTypesListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { loading: deleting, error: deleteError, del } = useDeleteJSON('', {
    onSuccess: () => {
      setDeletingId(null);
      router.refresh();
    },
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить тип "${name}"?\n\nВнимание: Удаление невозможно, если этот тип используется в транспортных средствах.`)) {
      return;
    }

    setDeletingId(id);
    await del(`/api/vehicle-types/${id}`);
  };

  return (
    <div className="space-y-4">
      {deleteError && <ErrorAlert error={deleteError} />}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название типа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Расход топлива
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Емкость бака
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vehicleTypes.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Fuel className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {type.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {type.fuel_consumption_per_100km}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">л/100км</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {type.tank_capacity ? (
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-gray-700">
                        {type.tank_capacity}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">л</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Не указана</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link href={`/dashboard/vehicle-types/${type.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(type.id, type.name)}
                    disabled={deleting && deletingId === type.id}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          ℹ️ О типах автомобилей
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Расход топлива используется для расчета ожидаемого потребления</li>
          <li>• Система обнаружит аномалии, если фактический расход превышает ожидаемый более чем на 15%</li>
          <li>• Емкость бака проверяется при заправке (необязательное поле)</li>
          <li>• Удаление типа возможно только если он не используется в транспортных средствах</li>
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteVehicleButton({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Вы уверены, что хотите удалить автомобиль "${vehicleName}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/dashboard/vehicles');
        router.refresh();
      } else {
        alert('Ошибка при удалении автомобиля');
      }
    } catch (error) {
      alert('Ошибка при удалении автомобиля');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
    >
      {isDeleting ? 'Удаление...' : 'Удалить'}
    </button>
  );
}

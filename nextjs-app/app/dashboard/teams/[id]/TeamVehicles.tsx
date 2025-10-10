'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  year?: number;
}

interface VehicleAssignment {
  id: string;
  vehicle: Vehicle;
  start_date: string;
  end_date?: string;
}

interface TeamVehiclesProps {
  teamId: string;
  orgId: string;
  initialAssignments: VehicleAssignment[];
}

export default function TeamVehicles({ teamId, orgId, initialAssignments }: TeamVehiclesProps) {
  const [assignments, setAssignments] = useState<VehicleAssignment[]>(initialAssignments);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Автомобили бригады</h2>
      </div>

      {assignments && assignments.length > 0 ? (
        <div className="bg-white border rounded-lg divide-y">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    {assignment.vehicle.make} {assignment.vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-600">
                    🚗 {assignment.vehicle.license_plate}
                  </p>
                  <p className="text-sm text-gray-500">
                    📅 С {new Date(assignment.start_date).toLocaleDateString('ru-RU')}
                    {assignment.end_date && ` до ${new Date(assignment.end_date).toLocaleDateString('ru-RU')}`}
                  </p>
                </div>
                <Link href={`/dashboard/vehicles/${assignment.vehicle.id}`}>
                  <Button variant="outline" size="sm">Просмотр</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500">Нет назначенных автомобилей</p>
          <p className="text-sm text-gray-400 mt-2">
            Автомобили назначаются через страницу транспорта
          </p>
        </div>
      )}
    </div>
  );
}

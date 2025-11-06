'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePostJSON } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';

interface VehicleAssignmentsProps {
  vehicleId: string;
  vehicleName: string;
  organizationId: string;
  teams: Array<{
    id: string;
    name: string;
  }>;
  initialAssignments: Array<{
    id: string;
    team_id: string;
    start_date: string;
    end_date: string | null;
    team: {
      name: string;
    };
  }>;
}

export function VehicleAssignments({
  vehicleId,
  vehicleName,
  organizationId,
  teams,
  initialAssignments,
}: VehicleAssignmentsProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showForm, setShowForm] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [assignmentToEnd, setAssignmentToEnd] = useState<string | null>(null);

  const { loading: createLoading, error: createError, post } = usePostJSON('/api/vehicle-assignments', {
    onSuccess: (data) => {
      setAssignments([...assignments, data.assignment]);
      setShowForm(false);
      router.refresh();
    },
  });

  const { loading: endLoading, error: endError, post: endAssignment } = usePostJSON(
    assignmentToEnd ? `/api/vehicle-assignments/${assignmentToEnd}` : '',
    {
      onSuccess: () => {
        setAssignmentToEnd(null);
        setEndDialogOpen(false);
        router.refresh();
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await post({
      vehicle_id: vehicleId,
      team_id: formData.get('team_id') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || null,
      organization_id: organizationId,
    });
  };

  const handleEndClick = (assignmentId: string) => {
    setAssignmentToEnd(assignmentId);
    setEndDialogOpen(true);
  };

  const handleEndConfirm = async () => {
    if (!assignmentToEnd) return;

    await fetch(`/api/vehicle-assignments/${assignmentToEnd}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: new Date().toISOString().split('T')[0] }),
    });

    // Обновляем через router.refresh() который вызывается в onSuccess
  };

  const activeAssignment = assignments.find((a) => !a.end_date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🚗 Назначение бригады</h2>
        {!activeAssignment && (
          <Button onClick={() => setShowForm(!showForm)} variant="outline">
            {showForm ? '❌ Отмена' : '➕ Назначить бригаду'}
          </Button>
        )}
      </div>

      {createError && <ErrorAlert error={createError} />}
      {endError && <ErrorAlert error={endError} />}

      {/* Current Assignment */}
      {activeAssignment && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900">
                ✅ Текущая бригада: {activeAssignment.team.name}
              </h3>
              <p className="text-sm text-green-700">
                С {new Date(activeAssignment.start_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <Button
              onClick={() => handleEndClick(activeAssignment.id)}
              variant="outline"
              size="sm"
            >
              🏁 Завершить
            </Button>
          </div>
        </div>
      )}

      {/* Assignment Form */}
      {showForm && !activeAssignment && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-4">
          <div>
            <Label htmlFor="team_id">Бригада *</Label>
            <Select name="team_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Выберите бригаду" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Дата начала *</Label>
              <Input
                type="date"
                id="start_date"
                name="start_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="end_date">Дата окончания</Label>
              <Input type="date" id="end_date" name="end_date" />
              <p className="text-xs text-gray-500 mt-1">Оставьте пустым для бессрочного</p>
            </div>
          </div>

          <Button type="submit" disabled={createLoading} className="w-full">
            {createLoading ? 'Сохранение...' : '✅ Назначить'}
          </Button>
        </form>
      )}

      {/* AlertDialog for ending assignment */}
      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Завершить назначение?</AlertDialogTitle>
            <AlertDialogDescription>
              Автомобиль будет откреплен от бригады. Вы сможете создать новое назначение после завершения текущего.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToEnd(null)}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndConfirm} disabled={endLoading}>
              {endLoading ? 'Завершение...' : '✅ Завершить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assignment History */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">📋 История назначений</h3>
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`border rounded p-3 ${
                  assignment.end_date ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{assignment.team.name}</span>
                    <div className="text-sm text-gray-600">
                      {new Date(assignment.start_date).toLocaleDateString('ru-RU')}
                      {' → '}
                      {assignment.end_date
                        ? new Date(assignment.end_date).toLocaleDateString('ru-RU')
                        : 'настоящее время'}
                    </div>
                  </div>
                  {assignment.end_date ? (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Завершено</span>
                  ) : (
                    <span className="text-xs bg-green-200 px-2 py-1 rounded">Активно</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

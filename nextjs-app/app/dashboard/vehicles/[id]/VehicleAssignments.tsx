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
import { supabase } from '@/lib/supabase/client';
import { getOrganizationIdClient } from '@/lib/getOrganizationIdClient';

interface VehicleAssignmentsProps {
  vehicleId: string;
  vehicleName: string;
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
  teams,
  initialAssignments,
}: VehicleAssignmentsProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      const teamId = formData.get('team_id') as string;
      const startDate = formData.get('start_date') as string;
      const endDate = formData.get('end_date') as string;

      const orgId = await getOrganizationIdClient();
      if (!orgId) {
        throw new Error('Organization ID not found');
      }

      const { data: newAssignment, error: insertError } = await supabase
        .from('vehicle_assignments')
        .insert({
          vehicle_id: vehicleId,
          team_id: teamId,
          start_date: startDate,
          end_date: endDate || null,
          organization_id: orgId,
        })
        .select(
          `
          *,
          team:teams(name)
        `
        )
        .single();

      if (insertError) throw insertError;

      setAssignments([...assignments, newAssignment as any]);
      setShowForm(false);
      router.refresh();
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.message || 'Ошибка создания назначения');
    } finally {
      setLoading(false);
    }
  };

  const handleEndAssignment = async (assignmentId: string) => {
    if (!confirm('Завершить назначение?')) return;

    try {
      const { error: updateError } = await supabase
        .from('vehicle_assignments')
        .update({ end_date: new Date().toISOString().split('T')[0] })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err: any) {
      console.error('Error ending assignment:', err);
      setError(err.message || 'Ошибка завершения назначения');
    }
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
              onClick={() => handleEndAssignment(activeAssignment.id)}
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Сохранение...' : '✅ Назначить'}
          </Button>
        </form>
      )}

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

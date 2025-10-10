import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';

/**
 * PATCH /api/vehicle-assignments/[id]
 * Update vehicle assignment (typically to end it)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const { id } = await params;
    const body = await request.json();
    const { end_date } = body;

    if (!end_date) {
      return apiBadRequest('Дата окончания обязательна');
    }

    // Проверка что назначение принадлежит организации
    const { data: existingAssignment } = await supabase
      .from('vehicle_assignments')
      .select('id, start_date')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingAssignment) {
      return apiBadRequest('Назначение не найдено');
    }

    // Проверка что end_date >= start_date
    if (new Date(end_date) < new Date(existingAssignment.start_date)) {
      return apiBadRequest('Дата окончания не может быть раньше даты начала');
    }

    // Обновить назначение
    const { data: assignment, error } = await supabase
      .from('vehicle_assignments')
      .update({ end_date })
      .eq('id', id)
      .select(`
        *,
        team:teams(name)
      `)
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'updating vehicle assignment', id });
    }

    return apiSuccess({ assignment });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PATCH /api/vehicle-assignments/:id' });
  }
}

/**
 * DELETE /api/vehicle-assignments/[id]
 * Delete vehicle assignment
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const { id } = await params;

    // Проверка что назначение принадлежит организации
    const { data: existingAssignment } = await supabase
      .from('vehicle_assignments')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existingAssignment) {
      return apiBadRequest('Назначение не найдено');
    }

    // Удалить назначение
    const { error } = await supabase
      .from('vehicle_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting vehicle assignment', id });
    }

    return apiSuccess({ message: 'Назначение удалено' });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicle-assignments/:id' });
  }
}

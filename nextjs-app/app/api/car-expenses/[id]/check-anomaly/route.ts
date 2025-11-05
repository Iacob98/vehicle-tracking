import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiErrorFromUnknown,
  checkAuthentication,
} from '@/lib/api-response';
import { type UserRole } from '@/lib/types/roles';

/**
 * PUT /api/car-expenses/:id/check-anomaly
 * Mark a fuel anomaly as checked by admin
 * Only admin and owner can mark anomalies as checked
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check permissions (only admin and owner)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!['admin', 'owner'].includes(userRole)) {
      return apiForbidden('У вас нет прав на проверку аномалий');
    }

    const { id } = params;

    // Get existing car expense
    const { data: existing, error: fetchError } = await supabase
      .from('car_expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return apiNotFound('Расход не найден');
    }

    // Check if it's a fuel expense with anomaly
    if (existing.category !== 'fuel' || !existing.has_anomaly) {
      return apiForbidden('Этот расход не является топливной аномалией');
    }

    // Mark anomaly as checked
    const { data: updated, error } = await supabase
      .from('car_expenses')
      .update({
        anomaly_checked_by: user!.id,
        anomaly_checked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'marking anomaly as checked',
        expenseId: id,
      });
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/car-expenses/:id/check-anomaly' });
  }
}

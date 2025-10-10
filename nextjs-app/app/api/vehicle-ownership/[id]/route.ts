import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';

/**
 * PATCH /api/vehicle-ownership/[id]
 * Обновить запись истории владения
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const { id } = await params;
    const body = await request.json();

    // Проверить что запись существует и принадлежит организации
    const { data: existing } = await supabase
      .from('vehicle_ownership_history')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existing) {
      return apiNotFound('Запись истории владения не найдена');
    }

    const {
      owner_name,
      owner_type,
      owner_contact,
      owner_address,
      start_date,
      end_date,
      purchase_price,
      sale_price,
      document_number,
      notes,
    } = body;

    // Валидация: если изменяется owner_name, он не должен быть пустым
    if (owner_name !== undefined && owner_name.trim() === '') {
      return apiBadRequest('owner_name не может быть пустым');
    }

    // Валидация дат
    const newStartDate = start_date || existing.start_date;
    const newEndDate = end_date !== undefined ? end_date : existing.end_date;

    if (newEndDate && new Date(newEndDate) < new Date(newStartDate)) {
      return apiBadRequest('Дата окончания владения не может быть раньше даты начала');
    }

    // Обновить запись
    const updateData: any = {};
    if (owner_name !== undefined) updateData.owner_name = owner_name.trim();
    if (owner_type !== undefined) updateData.owner_type = owner_type;
    if (owner_contact !== undefined) updateData.owner_contact = owner_contact || null;
    if (owner_address !== undefined) updateData.owner_address = owner_address || null;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date || null;
    if (purchase_price !== undefined) updateData.purchase_price = purchase_price || null;
    if (sale_price !== undefined) updateData.sale_price = sale_price || null;
    if (document_number !== undefined) updateData.document_number = document_number || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const { data: ownership, error } = await supabase
      .from('vehicle_ownership_history')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'updating ownership history', id });
    }

    return apiSuccess({ ownership });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PATCH /api/vehicle-ownership/[id]' });
  }
}

/**
 * DELETE /api/vehicle-ownership/[id]
 * Удалить запись истории владения
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const { id } = await params;

    // Проверить что запись существует
    const { data: existing } = await supabase
      .from('vehicle_ownership_history')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!existing) {
      return apiNotFound('Запись истории владения не найдена');
    }

    // Удалить запись
    const { error } = await supabase
      .from('vehicle_ownership_history')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting ownership history', id });
    }

    return apiSuccess({ message: 'Запись истории владения удалена' });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicle-ownership/[id]' });
  }
}

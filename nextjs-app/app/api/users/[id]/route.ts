import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * DELETE /api/users/[id]
 * Удаление пользователя
 *
 * Проверяет:
 * - Авторизацию
 * - Принадлежность пользователя к организации
 * - Запрещает удаление самого себя
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin может удалять пользователей)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageUsers(userRole)) {
      return apiForbidden('У вас нет прав на удаление пользователей');
    }

    // Запрет удаления самого себя
    if (user!.id === id) {
      return apiForbidden('Вы не можете удалить свою учетную запись');
    }

    // Verify user belongs to same organization
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!targetUser || targetUser.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этому пользователю');
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting user', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/users/[id]' });
  }
}

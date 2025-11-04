import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * PATCH /api/users/[id]
 * Обновление данных пользователя
 *
 * Водители могут обновлять только свой fuel_card_id
 * Админы могут обновлять любые данные других пользователей
 */
export async function PATCH(
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

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    const userContext = getUserQueryContext(user);

    // Verify user belongs to same organization
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return apiForbidden('Пользователь не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, targetUser.organization_id)) {
      return apiForbidden('У вас нет доступа к этому пользователю');
    }

    // Получаем данные для обновления
    const body = await request.json();

    // Если это водитель, он может обновить только свой fuel_card_id
    if (userRole === 'driver') {
      // Водитель может обновлять только свои данные
      if (user!.id !== id) {
        return apiForbidden('Водители могут редактировать только свой профиль');
      }

      // Водитель может обновить только fuel_card_id
      const allowedFields = ['fuel_card_id'];
      const updates: any = {};

      for (const field of allowedFields) {
        if (field in body) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return apiForbidden('Нет разрешенных полей для обновления');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return apiErrorFromUnknown(error, { context: 'updating user fuel_card_id', id, orgId: targetUser.organization_id });
      }

      return apiSuccess({ user: data });
    }

    // Для админов/менеджеров - могут обновлять больше полей
    // (здесь можно добавить логику для других ролей)
    return apiForbidden('У вас нет прав на редактирование данных пользователя');
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PATCH /api/users/[id]' });
  }
}

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

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
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

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Verify user belongs to same organization
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return apiForbidden('Пользователь не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, targetUser.organization_id)) {
      return apiForbidden('У вас нет доступа к этому пользователю');
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting user', id, orgId: targetUser.organization_id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/users/[id]' });
  }
}

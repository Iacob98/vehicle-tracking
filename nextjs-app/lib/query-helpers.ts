/**
 * Query Helpers
 * Утилиты для построения Supabase queries с правильной обработкой owner роли
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Информация о пользователе для построения queries
 */
export interface UserQueryContext {
  role: string;
  organizationId: string | null;
  isOwner: boolean;
}

/**
 * Получает контекст пользователя из user объекта
 */
export function getUserQueryContext(user: any): UserQueryContext {
  const role = user?.role || user?.user_metadata?.role || 'viewer';
  const organizationId = user?.organization_id || user?.user_metadata?.organization_id || null;
  const isOwner = role === 'owner';

  return {
    role,
    organizationId,
    isOwner,
  };
}

/**
 * Применяет фильтр по organization_id к query, если пользователь не owner.
 * Owner видит все данные всех организаций (RLS политики это разрешают).
 *
 * @example
 * ```typescript
 * const userContext = getUserQueryContext(user);
 * let query = supabase.from('vehicles').select('*');
 * query = applyOrgFilter(query, userContext);
 * ```
 */
export function applyOrgFilter<T>(
  query: any,
  userContext: UserQueryContext
): any {
  // Owner видит все данные - не применяем фильтр
  if (userContext.isOwner) {
    return query;
  }

  // Остальные роли видят только свою организацию
  if (userContext.organizationId) {
    return query.eq('organization_id', userContext.organizationId);
  }

  // Если нет organization_id и не owner - вернём пустой результат
  // (такого не должно быть если используется checkOwnerOrOrganizationId)
  return query.eq('organization_id', '00000000-0000-0000-0000-000000000000');
}

/**
 * Проверяет имеет ли пользователь доступ к ресурсу с указанным organization_id.
 * Owner имеет доступ ко всему.
 *
 * @example
 * ```typescript
 * const userContext = getUserQueryContext(user);
 * if (!canAccessResource(userContext, vehicle.organization_id)) {
 *   return apiForbidden();
 * }
 * ```
 */
export function canAccessResource(
  userContext: UserQueryContext,
  resourceOrgId: string | null
): boolean {
  // Owner имеет доступ ко всему
  if (userContext.isOwner) {
    return true;
  }

  // Проверяем совпадение organization_id
  return userContext.organizationId === resourceOrgId;
}

/**
 * Получает organization_id для создания нового ресурса.
 * Если пользователь owner, должен быть явно указан targetOrgId.
 * Для остальных ролей используется их organization_id.
 *
 * @param userContext - контекст пользователя
 * @param targetOrgId - явно указанный organization_id (требуется для owner)
 * @returns organization_id для нового ресурса или null если targetOrgId не указан для owner
 *
 * @example
 * ```typescript
 * // Owner создаёт ресурс для организации
 * const orgId = getOrgIdForCreate(userContext, req.body.organization_id);
 * if (!orgId) {
 *   return apiBadRequest('Organization ID обязателен для owner');
 * }
 *
 * // Admin/Manager создают ресурс для своей организации
 * const orgId = getOrgIdForCreate(userContext);
 * ```
 */
export function getOrgIdForCreate(
  userContext: UserQueryContext,
  targetOrgId?: string | null
): string | null {
  // Owner должен явно указать для какой организации создаёт ресурс
  if (userContext.isOwner) {
    return targetOrgId || null;
  }

  // Остальные роли используют свой organization_id
  return userContext.organizationId;
}

/**
 * Проверяет может ли пользователь создавать ресурсы
 */
export function canCreate(userContext: UserQueryContext): boolean {
  return ['owner', 'admin', 'manager'].includes(userContext.role);
}

/**
 * Проверяет может ли пользователь обновлять ресурсы
 */
export function canUpdate(userContext: UserQueryContext): boolean {
  return ['owner', 'admin', 'manager'].includes(userContext.role);
}

/**
 * Проверяет может ли пользователь удалять ресурсы
 */
export function canDelete(userContext: UserQueryContext): boolean {
  return ['owner', 'admin'].includes(userContext.role);
}

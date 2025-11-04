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
  /** @deprecated Используйте isSuperAdmin вместо isOwner */
  isOwner: boolean;
  /** Super admin = owner ИЛИ admin с NULL organization_id */
  isSuperAdmin: boolean;
}

/**
 * Получает контекст пользователя из user объекта
 * Поддерживает два формата:
 * 1. Supabase auth user (с user_metadata)
 * 2. Плоский User объект из getCurrentUser()
 */
export function getUserQueryContext(user: any): UserQueryContext {
  // Сначала проверяем user_metadata (Supabase auth user)
  // Затем проверяем прямые поля (User объект из getCurrentUser)
  const role = user?.user_metadata?.role || user?.role || 'viewer';
  const organizationId = user?.user_metadata?.organization_id ?? user?.organization_id ?? null;

  // Deprecated: используется для обратной совместимости
  const isOwner = role === 'owner';

  // Super admin = owner ИЛИ (admin с NULL organization_id)
  const isSuperAdmin = role === 'owner' || (role === 'admin' && organizationId === null);

  return {
    role,
    organizationId,
    isOwner,
    isSuperAdmin,
  };
}

/**
 * Применяет фильтр по organization_id к query, если пользователь не super admin.
 * Super admin (owner ИЛИ admin с NULL org_id) видит все данные всех организаций.
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
  // Super admin видит все данные - не применяем фильтр
  if (userContext.isSuperAdmin) {
    return query;
  }

  // Остальные роли видят только свою организацию
  if (userContext.organizationId) {
    return query.eq('organization_id', userContext.organizationId);
  }

  // Если нет organization_id и не super admin - вернём пустой результат
  // (такого не должно быть если используется checkOwnerOrOrganizationId)
  return query.eq('organization_id', '00000000-0000-0000-0000-000000000000');
}

/**
 * Проверяет имеет ли пользователь доступ к ресурсу с указанным organization_id.
 * Super admin (owner ИЛИ admin с NULL org_id) имеет доступ ко всему.
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
  // Super admin имеет доступ ко всему
  if (userContext.isSuperAdmin) {
    return true;
  }

  // Проверяем совпадение organization_id
  return userContext.organizationId === resourceOrgId;
}

/**
 * Получает organization_id для создания нового ресурса.
 * Если пользователь super admin, должен быть явно указан targetOrgId.
 * Для остальных ролей используется их organization_id.
 *
 * @param userContext - контекст пользователя
 * @param targetOrgId - явно указанный organization_id (требуется для super admin)
 * @returns organization_id для нового ресурса или null если targetOrgId не указан для super admin
 *
 * @example
 * ```typescript
 * // Super admin создаёт ресурс для организации
 * const orgId = getOrgIdForCreate(userContext, req.body.organization_id);
 * if (!orgId) {
 *   return apiBadRequest('Organization ID обязателен для super admin');
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
  // Super admin должен явно указать для какой организации создаёт ресурс
  if (userContext.isSuperAdmin) {
    return targetOrgId || null;
  }

  // Остальные роли используют свой organization_id
  return userContext.organizationId;
}

/**
 * Проверяет может ли пользователь создавать ресурсы
 */
export function canCreate(userContext: UserQueryContext): boolean {
  return userContext.isSuperAdmin || ['admin', 'manager'].includes(userContext.role);
}

/**
 * Проверяет может ли пользователь обновлять ресурсы
 */
export function canUpdate(userContext: UserQueryContext): boolean {
  return userContext.isSuperAdmin || ['admin', 'manager'].includes(userContext.role);
}

/**
 * Проверяет может ли пользователь удалять ресурсы
 */
export function canDelete(userContext: UserQueryContext): boolean {
  return userContext.isSuperAdmin || userContext.role === 'admin';
}

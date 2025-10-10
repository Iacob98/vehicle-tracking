'use client';

import { type ReactNode } from 'react';
import { type UserRole } from '@/lib/types/roles';

interface RoleGuardProps {
  /**
   * Разрешенные роли для отображения контента
   */
  allowedRoles: UserRole[];

  /**
   * Текущая роль пользователя
   */
  userRole: UserRole;

  /**
   * Контент для отображения если роль разрешена
   */
  children: ReactNode;

  /**
   * Опциональный fallback если роль не разрешена
   */
  fallback?: ReactNode;
}

/**
 * RoleGuard - условный рендеринг по ролям
 *
 * @example
 * // Кнопка видна только админам и менеджерам
 * <RoleGuard allowedRoles={['admin', 'manager']} userRole={currentUser.role}>
 *   <Button>Удалить</Button>
 * </RoleGuard>
 *
 * @example
 * // С fallback сообщением
 * <RoleGuard
 *   allowedRoles={['admin']}
 *   userRole={currentUser.role}
 *   fallback={<p>Доступ только для администраторов</p>}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({ allowedRoles, userRole, children, fallback = null }: RoleGuardProps) {
  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

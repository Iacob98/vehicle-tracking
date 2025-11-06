import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  organization_id: string | null;
  phone?: string;
  created_at?: string;
}

/**
 * Получить текущего пользователя из auth.users.user_metadata
 * Это избегает проблем с RLS при запросе к public.users
 */
export async function getCurrentUser(): Promise<User> {
  const supabase = await createServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const userMetadata = authUser.user_metadata || {};

  return {
    id: authUser.id,
    email: authUser.email || '',
    role: (userMetadata.role || 'viewer') as UserRole,
    first_name: userMetadata.first_name || '',
    last_name: userMetadata.last_name || '',
    organization_id: userMetadata.organization_id || null,
    phone: userMetadata.phone || '',
    created_at: authUser.created_at,
  };
}

/**
 * Проверить, имеет ли пользователь одну из указанных ролей
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser();

  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard');
  }

  return user;
}

/**
 * Проверить, является ли пользователь owner (видит все организации)
 * @deprecated Используйте isSuperAdmin вместо этой функции
 */
export function isOwner(user: User): boolean {
  return user.role === 'owner';
}

/**
 * Проверить, является ли пользователь super admin (видит все организации)
 * Super admin = owner ИЛИ admin с organization_id = NULL
 */
export function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

/**
 * Проверить, может ли пользователь управлять организациями
 * Только super admin может управлять организациями
 */
export function canManageOrganizations(user: User): boolean {
  return isSuperAdmin(user);
}

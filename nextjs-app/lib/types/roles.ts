/**
 * User Roles - упрощенная система (4 роли)
 *
 * @description
 * - admin: Полный доступ (объединяет owner + admin)
 * - manager: Управление операциями, аналитика
 * - driver: Водители (объединяет team_lead + worker)
 * - viewer: Только чтение данных
 */

export type UserRole = 'admin' | 'manager' | 'driver' | 'viewer';

/**
 * Роли с иконками и описаниями для UI
 */
export const ROLES = {
  admin: {
    value: 'admin' as const,
    label: '👑 Админ',
    description: 'Полный доступ к системе',
    color: 'red',
  },
  manager: {
    value: 'manager' as const,
    label: '💼 Менеджер',
    description: 'Управление операциями и аналитика',
    color: 'blue',
  },
  driver: {
    value: 'driver' as const,
    label: '🚗 Водитель',
    description: 'Заправки, штрафы и документы',
    color: 'green',
  },
  viewer: {
    value: 'viewer' as const,
    label: '👁️ Просмотр',
    description: 'Только чтение данных',
    color: 'gray',
  },
} as const;

/**
 * Массив всех ролей для Select/Dropdown
 */
export const ROLE_OPTIONS = [
  ROLES.admin,
  ROLES.manager,
  ROLES.driver,
  ROLES.viewer,
] as const;

/**
 * Получить информацию о роли
 */
export function getRoleInfo(role: UserRole) {
  return ROLES[role] || ROLES.viewer;
}

/**
 * Проверка прав доступа
 */
export const Permissions = {
  /**
   * Может ли пользователь управлять пользователями (создавать, удалять, менять роли)
   */
  canManageUsers: (role: UserRole): boolean => {
    return role === 'admin';
  },

  /**
   * Может ли пользователь управлять бригадами
   */
  canManageTeams: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager';
  },

  /**
   * Может ли пользователь управлять автомобилями (CRUD)
   */
  canManageVehicles: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager';
  },

  /**
   * Может ли пользователь добавлять расходы (заправки)
   */
  canAddExpenses: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager' || role === 'driver';
  },

  /**
   * Может ли пользователь добавлять штрафы
   */
  canAddPenalties: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager' || role === 'driver';
  },

  /**
   * Может ли пользователь видеть аналитику
   */
  canViewAnalytics: (role: UserRole): boolean => {
    return role !== 'viewer'; // Все кроме viewer
  },

  /**
   * Может ли пользователь редактировать данные
   */
  canEdit: (role: UserRole): boolean => {
    return role !== 'viewer';
  },

  /**
   * Может ли пользователь удалять данные
   */
  canDelete: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager';
  },

  /**
   * Может ли пользователь настраивать лимиты анти-фрод
   */
  canManageFraudLimits: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager';
  },

  /**
   * Может ли пользователь просматривать анти-фрод алерты
   */
  canViewFraudAlerts: (role: UserRole): boolean => {
    return role === 'admin' || role === 'manager';
  },
} as const;

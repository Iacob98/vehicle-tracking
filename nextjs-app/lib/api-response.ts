/**
 * API Response Helpers
 * Централизованная обработка ответов и ошибок для API роутов
 */

import { NextResponse } from 'next/server';
import { formatError, logError, AppError, createAuthenticationError, createAuthorizationError, ErrorType } from './errors';

// ============================================================================
// ТИПЫ ДЛЯ API ОТВЕТОВ
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  data?: T;
  success?: boolean;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  type?: ErrorType;
  details?: string;
  field?: string;
  code?: string;
}

// ============================================================================
// УСПЕШНЫЕ ОТВЕТЫ
// ============================================================================

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================================
// ОТВЕТЫ С ОШИБКАМИ
// ============================================================================

export function apiError(appError: AppError, statusCode?: number): NextResponse {
  // Определяем HTTP статус код на основе типа ошибки
  const status = statusCode || getStatusCodeFromErrorType(appError.type);

  // Логируем ошибку
  logError(appError);

  // Формируем ответ
  const response: ApiErrorResponse = {
    error: appError.message,
    type: appError.type,
    details: appError.details,
    field: appError.field,
    code: appError.code,
  };

  return NextResponse.json(response, { status });
}

export function apiErrorFromUnknown(error: unknown, context?: Record<string, unknown>): NextResponse {
  const appError = formatError(error);

  // Добавляем контекст в логи
  if (context) {
    logError(appError, context);
  } else {
    logError(appError);
  }

  return apiError(appError);
}

// ============================================================================
// СПЕЦИФИЧНЫЕ ОШИБКИ
// ============================================================================

export function apiUnauthorized(message?: string): NextResponse {
  const error = createAuthenticationError(message);
  return apiError(error, 401);
}

export function apiForbidden(message?: string): NextResponse {
  const error = createAuthorizationError(message);
  return apiError(error, 403);
}

export function apiBadRequest(message: string, field?: string): NextResponse {
  const error: AppError = {
    type: ErrorType.VALIDATION,
    message,
    field,
  };
  return apiError(error, 400);
}

export function apiNotFound(message: string = 'Ресурс не найден'): NextResponse {
  const error: AppError = {
    type: ErrorType.UNKNOWN,
    message,
  };
  return apiError(error, 404);
}

export function apiInternalError(message: string = 'Внутренняя ошибка сервера'): NextResponse {
  const error: AppError = {
    type: ErrorType.UNKNOWN,
    message,
  };
  return apiError(error, 500);
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

function getStatusCodeFromErrorType(type: ErrorType): number {
  switch (type) {
    case ErrorType.VALIDATION:
      return 400;

    case ErrorType.AUTHENTICATION:
      return 401;

    case ErrorType.AUTHORIZATION:
    case ErrorType.RLS_POLICY:
      return 403;

    case ErrorType.UNIQUE_VIOLATION:
    case ErrorType.FOREIGN_KEY_VIOLATION:
    case ErrorType.CHECK_VIOLATION:
    case ErrorType.NOT_NULL_VIOLATION:
      return 400;

    case ErrorType.DATABASE:
    case ErrorType.FILE_UPLOAD:
    case ErrorType.FILE_SIZE:
    case ErrorType.FILE_TYPE:
    case ErrorType.BUSINESS_LOGIC:
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.UNKNOWN:
    default:
      return 500;
  }
}

// ============================================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================================

export function checkAuthentication(user: any): NextResponse | null {
  if (!user) {
    return apiUnauthorized();
  }
  return null;
}

/**
 * @deprecated Используйте checkOwnerOrOrganizationId вместо этой функции.
 * Эта функция не поддерживает owner роль с NULL organization_id.
 */
export function checkOrganizationId(user: any): { orgId: string; error: NextResponse | null } {
  const orgId = user?.user_metadata?.organization_id;

  if (!orgId) {
    return {
      orgId: '',
      error: apiBadRequest('Organization ID не найден'),
    };
  }

  return { orgId, error: null };
}

/**
 * Проверяет organization_id с поддержкой super admin роли.
 * Super admin (owner ИЛИ admin с NULL org_id) видит все данные всех организаций.
 *
 * @returns {
 *   orgId: string | null - ID организации или null для super admin
 *   isOwner: boolean - @deprecated true если пользователь имеет роль owner
 *   isSuperAdmin: boolean - true если пользователь super admin (owner ИЛИ admin с NULL org_id)
 *   error: NextResponse | null - ошибка если пользователь не super admin и не имеет organization_id
 * }
 */
export function checkOwnerOrOrganizationId(user: any): {
  orgId: string | null;
  /** @deprecated Используйте isSuperAdmin */
  isOwner: boolean;
  isSuperAdmin: boolean;
  error: NextResponse | null
} {
  const role = user?.user_metadata?.role;
  const orgId = user?.user_metadata?.organization_id;

  // Super admin = owner ИЛИ (admin с NULL organization_id)
  const isSuperAdmin = role === 'owner' || (role === 'admin' && !orgId);
  const isOwner = role === 'owner';  // Deprecated - для обратной совместимости

  if (isSuperAdmin) {
    return { orgId: null, isOwner, isSuperAdmin: true, error: null };
  }

  // Остальные роли должны иметь organization_id
  if (!orgId) {
    return {
      orgId: null,
      isOwner: false,
      isSuperAdmin: false,
      error: apiBadRequest('Organization ID не найден'),
    };
  }

  return { orgId, isOwner: false, isSuperAdmin: false, error: null };
}

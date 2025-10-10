/**
 * Централизованная система обработки ошибок
 * Типы ошибок, утилиты для парсинга и форматирования
 */

import { PostgrestError } from '@supabase/supabase-js';

// ============================================================================
// ТИПЫ ОШИБОК
// ============================================================================

export enum ErrorType {
  // Валидация
  VALIDATION = 'VALIDATION',

  // База данных
  DATABASE = 'DATABASE',
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  CHECK_VIOLATION = 'CHECK_VIOLATION',
  NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',

  // Авторизация
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',

  // RLS
  RLS_POLICY = 'RLS_POLICY',

  // Сеть
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',

  // Файлы
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_SIZE = 'FILE_SIZE',
  FILE_TYPE = 'FILE_TYPE',

  // Бизнес-логика
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',

  // Неизвестная ошибка
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  field?: string;
  code?: string;
  originalError?: unknown;
}

// ============================================================================
// POSTGRES ERROR CODES
// ============================================================================

const POSTGRES_ERROR_CODES: Record<string, ErrorType> = {
  '23505': ErrorType.UNIQUE_VIOLATION,       // unique_violation
  '23503': ErrorType.FOREIGN_KEY_VIOLATION,  // foreign_key_violation
  '23514': ErrorType.CHECK_VIOLATION,        // check_violation
  '23502': ErrorType.NOT_NULL_VIOLATION,     // not_null_violation
  '42501': ErrorType.RLS_POLICY,             // insufficient_privilege (часто RLS)
};

// ============================================================================
// ПАРСИНГ ОШИБОК SUPABASE
// ============================================================================

export function parseSupabaseError(error: PostgrestError): AppError {
  const code = error.code;
  const message = error.message;
  const details = error.details;
  const hint = error.hint;

  // Определяем тип ошибки по коду
  const errorType = code ? POSTGRES_ERROR_CODES[code] || ErrorType.DATABASE : ErrorType.DATABASE;

  // Формируем понятное сообщение
  let userMessage = '';
  let field: string | undefined;

  switch (errorType) {
    case ErrorType.UNIQUE_VIOLATION:
      userMessage = parseUniqueViolation(message, details);
      field = extractFieldFromConstraint(details);
      break;

    case ErrorType.FOREIGN_KEY_VIOLATION:
      userMessage = 'Невозможно выполнить операцию: связанные данные не существуют или уже используются';
      break;

    case ErrorType.CHECK_VIOLATION:
      userMessage = parseCheckViolation(message, details);
      field = extractFieldFromConstraint(details);
      break;

    case ErrorType.NOT_NULL_VIOLATION:
      userMessage = 'Обязательное поле не может быть пустым';
      field = extractFieldFromConstraint(details);
      break;

    case ErrorType.RLS_POLICY:
      userMessage = 'У вас нет прав для выполнения этой операции';
      break;

    default:
      userMessage = 'Ошибка при работе с базой данных';
  }

  return {
    type: errorType,
    message: userMessage,
    details: hint || details || message,
    field,
    code,
    originalError: error,
  };
}

// ============================================================================
// ПАРСИНГ СПЕЦИФИЧНЫХ ОШИБОК
// ============================================================================

function parseUniqueViolation(message: string, details?: string): string {
  if (!details) return 'Такая запись уже существует';

  // Извлекаем имя constraint из details
  const constraintMatch = details.match(/Key \((.*?)\)=/);
  if (!constraintMatch) return 'Такая запись уже существует';

  const field = constraintMatch[1];

  // Специфичные сообщения для разных полей
  const fieldMessages: Record<string, string> = {
    email: 'Пользователь с таким email уже существует',
    license_plate: 'Автомобиль с таким номером уже существует',
    vin: 'Автомобиль с таким VIN уже существует',
    name: 'Запись с таким названием уже существует',
  };

  return fieldMessages[field] || `Значение поля "${field}" должно быть уникальным`;
}

function parseCheckViolation(message: string, details?: string): string {
  if (!details) return 'Данные не соответствуют требованиям';

  // Примеры: amount > 0, year >= 1900
  if (details.includes('amount') && details.includes('> 0')) {
    return 'Сумма должна быть положительной';
  }

  if (details.includes('year')) {
    return 'Год должен быть корректным';
  }

  if (details.includes('mileage')) {
    return 'Пробег должен быть положительным числом';
  }

  return 'Данные не соответствуют требованиям';
}

function extractFieldFromConstraint(details?: string): string | undefined {
  if (!details) return undefined;

  // Извлекаем имя поля из сообщения constraint
  const match = details.match(/Key \((.*?)\)=/) || details.match(/column "(.*?)"/);
  return match ? match[1] : undefined;
}

// ============================================================================
// УТИЛИТЫ ДЛЯ ФОРМАТИРОВАНИЯ
// ============================================================================

export function formatError(error: unknown): AppError {
  // PostgrestError от Supabase
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return parseSupabaseError(error as PostgrestError);
  }

  // Стандартная JavaScript Error
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'Произошла неизвестная ошибка',
      originalError: error,
    };
  }

  // Auth ошибки Supabase
  if (error && typeof error === 'object' && 'status' in error) {
    const authError = error as { status: number; message?: string };

    if (authError.status === 401) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: 'Неверный email или пароль',
        originalError: error,
      };
    }

    if (authError.status === 403) {
      return {
        type: ErrorType.AUTHORIZATION,
        message: 'У вас нет прав для выполнения этой операции',
        originalError: error,
      };
    }
  }

  // Строка
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      originalError: error,
    };
  }

  // Неизвестный тип
  return {
    type: ErrorType.UNKNOWN,
    message: 'Произошла неизвестная ошибка',
    originalError: error,
  };
}

// ============================================================================
// СОЗДАНИЕ ОШИБОК
// ============================================================================

export function createValidationError(message: string, field?: string): AppError {
  return {
    type: ErrorType.VALIDATION,
    message,
    field,
  };
}

export function createAuthenticationError(message: string = 'Требуется авторизация'): AppError {
  return {
    type: ErrorType.AUTHENTICATION,
    message,
  };
}

export function createAuthorizationError(message: string = 'Недостаточно прав'): AppError {
  return {
    type: ErrorType.AUTHORIZATION,
    message,
  };
}

export function createFileUploadError(message: string, details?: string): AppError {
  return {
    type: ErrorType.FILE_UPLOAD,
    message,
    details,
  };
}

export function createBusinessLogicError(message: string, details?: string): AppError {
  return {
    type: ErrorType.BUSINESS_LOGIC,
    message,
    details,
  };
}

// ============================================================================
// ПРОВЕРКИ ТИПОВ ОШИБОК
// ============================================================================

export function isValidationError(error: AppError): boolean {
  return error.type === ErrorType.VALIDATION;
}

export function isDatabaseError(error: AppError): boolean {
  return [
    ErrorType.DATABASE,
    ErrorType.UNIQUE_VIOLATION,
    ErrorType.FOREIGN_KEY_VIOLATION,
    ErrorType.CHECK_VIOLATION,
    ErrorType.NOT_NULL_VIOLATION,
  ].includes(error.type);
}

export function isAuthError(error: AppError): boolean {
  return [ErrorType.AUTHENTICATION, ErrorType.AUTHORIZATION, ErrorType.RLS_POLICY].includes(
    error.type
  );
}

export function isRetryable(error: AppError): boolean {
  return [ErrorType.NETWORK, ErrorType.TIMEOUT].includes(error.type);
}

// ============================================================================
// ЛОГИРОВАНИЕ ОШИБОК
// ============================================================================

export function logError(error: AppError, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Application Error:', {
      type: error.type,
      message: error.message,
      details: error.details,
      field: error.field,
      code: error.code,
      context,
      originalError: error.originalError,
    });
  } else {
    // В продакшене можно отправлять в сервис логирования (Sentry, LogRocket и т.д.)
    console.error('Application Error:', error.type, error.message);
  }
}

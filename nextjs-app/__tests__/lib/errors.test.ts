/**
 * Unit tests for centralized error handling system
 */

import {
  ErrorType,
  AppError,
  parseSupabaseError,
  formatError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createFileUploadError,
  createBusinessLogicError,
  isValidationError,
  isDatabaseError,
  isAuthError,
  isRetryable,
} from '@/lib/errors';

describe('Error System', () => {
  // ============================================================================
  // parseSupabaseError
  // ============================================================================

  describe('parseSupabaseError', () => {
    it('should parse unique violation error', () => {
      const postgrestError = {
        message: 'duplicate key value violates unique constraint',
        details: 'Key (license_plate)=(B-AB 1234) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.UNIQUE_VIOLATION);
      expect(result.message).toBe('Автомобиль с таким номером уже существует');
      expect(result.field).toBe('license_plate');
      expect(result.code).toBe('23505');
    });

    it('should parse foreign key violation error', () => {
      const postgrestError = {
        message: 'foreign key violation',
        details: 'Referenced key not found',
        hint: null,
        code: '23503',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.FOREIGN_KEY_VIOLATION);
      expect(result.message).toContain('связанные данные не существуют');
    });

    it('should parse not null violation error', () => {
      const postgrestError = {
        message: 'null value in column "name" violates not-null constraint',
        details: 'Failing row contains (null)',
        hint: null,
        code: '23502',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.NOT_NULL_VIOLATION);
      expect(result.message).toBe('Обязательное поле не может быть пустым');
    });

    it('should parse RLS policy error', () => {
      const postgrestError = {
        message: 'new row violates row-level security policy',
        details: 'Policy error',
        hint: null,
        code: '42501',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.RLS_POLICY);
      expect(result.message).toBe('У вас нет прав для выполнения этой операции');
    });

    it('should parse check violation with amount constraint', () => {
      const postgrestError = {
        message: 'check constraint violation',
        details: 'amount > 0',
        hint: null,
        code: '23514',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.CHECK_VIOLATION);
      expect(result.message).toBe('Сумма должна быть положительной');
    });

    it('should handle unknown postgres error code', () => {
      const postgrestError = {
        message: 'some database error',
        details: 'error details',
        hint: null,
        code: '99999',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.type).toBe(ErrorType.DATABASE);
      expect(result.message).toBe('Ошибка при работе с базой данных');
    });
  });

  // ============================================================================
  // formatError
  // ============================================================================

  describe('formatError', () => {
    it('should format PostgrestError', () => {
      const postgrestError = {
        message: 'error',
        details: 'Key (email)=(test@test.com) already exists.',
        hint: null,
        code: '23505',
      };

      const result = formatError(postgrestError);

      expect(result.type).toBe(ErrorType.UNIQUE_VIOLATION);
      expect(result.message).toBe('Пользователь с таким email уже существует');
    });

    it('should format JavaScript Error', () => {
      const error = new Error('Network connection failed');

      const result = formatError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Network connection failed');
    });

    it('should format auth error with status 401', () => {
      const authError = {
        status: 401,
        message: 'Invalid credentials',
      };

      const result = formatError(authError);

      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.message).toBe('Неверный email или пароль');
    });

    it('should format auth error with status 403', () => {
      const authError = {
        status: 403,
        message: 'Forbidden',
      };

      const result = formatError(authError);

      expect(result.type).toBe(ErrorType.AUTHORIZATION);
      expect(result.message).toContain('нет прав');
    });

    it('should format string error', () => {
      const result = formatError('Something went wrong');

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle unknown error type', () => {
      const result = formatError(null);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Произошла неизвестная ошибка');
    });
  });

  // ============================================================================
  // Error Creators
  // ============================================================================

  describe('Error Creators', () => {
    it('createValidationError should create validation error', () => {
      const error = createValidationError('Invalid email format', 'email');

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid email format');
      expect(error.field).toBe('email');
    });

    it('createAuthenticationError should create auth error', () => {
      const error = createAuthenticationError();

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.message).toBe('Требуется авторизация');
    });

    it('createAuthorizationError should create authorization error', () => {
      const error = createAuthorizationError('Custom message');

      expect(error.type).toBe(ErrorType.AUTHORIZATION);
      expect(error.message).toBe('Custom message');
    });

    it('createFileUploadError should create file upload error', () => {
      const error = createFileUploadError('File too large', 'Max 5MB');

      expect(error.type).toBe(ErrorType.FILE_UPLOAD);
      expect(error.message).toBe('File too large');
      expect(error.details).toBe('Max 5MB');
    });

    it('createBusinessLogicError should create business logic error', () => {
      const error = createBusinessLogicError('Cannot delete active vehicle');

      expect(error.type).toBe(ErrorType.BUSINESS_LOGIC);
      expect(error.message).toBe('Cannot delete active vehicle');
    });
  });

  // ============================================================================
  // Error Type Checkers
  // ============================================================================

  describe('Error Type Checkers', () => {
    it('isValidationError should detect validation errors', () => {
      const error = createValidationError('test');
      expect(isValidationError(error)).toBe(true);

      const authError = createAuthenticationError();
      expect(isValidationError(authError)).toBe(false);
    });

    it('isDatabaseError should detect database errors', () => {
      const uniqueError: AppError = {
        type: ErrorType.UNIQUE_VIOLATION,
        message: 'test',
      };
      expect(isDatabaseError(uniqueError)).toBe(true);

      const foreignKeyError: AppError = {
        type: ErrorType.FOREIGN_KEY_VIOLATION,
        message: 'test',
      };
      expect(isDatabaseError(foreignKeyError)).toBe(true);

      const checkError: AppError = {
        type: ErrorType.CHECK_VIOLATION,
        message: 'test',
      };
      expect(isDatabaseError(checkError)).toBe(true);

      const notNullError: AppError = {
        type: ErrorType.NOT_NULL_VIOLATION,
        message: 'test',
      };
      expect(isDatabaseError(notNullError)).toBe(true);

      const authError = createAuthenticationError();
      expect(isDatabaseError(authError)).toBe(false);
    });

    it('isAuthError should detect auth errors', () => {
      const authError = createAuthenticationError();
      expect(isAuthError(authError)).toBe(true);

      const authzError = createAuthorizationError();
      expect(isAuthError(authzError)).toBe(true);

      const rlsError: AppError = {
        type: ErrorType.RLS_POLICY,
        message: 'test',
      };
      expect(isAuthError(rlsError)).toBe(true);

      const validationError = createValidationError('test');
      expect(isAuthError(validationError)).toBe(false);
    });

    it('isRetryable should detect retryable errors', () => {
      const networkError: AppError = {
        type: ErrorType.NETWORK,
        message: 'test',
      };
      expect(isRetryable(networkError)).toBe(true);

      const timeoutError: AppError = {
        type: ErrorType.TIMEOUT,
        message: 'test',
      };
      expect(isRetryable(timeoutError)).toBe(true);

      const validationError = createValidationError('test');
      expect(isRetryable(validationError)).toBe(false);
    });
  });

  // ============================================================================
  // Field Extraction
  // ============================================================================

  describe('Field Extraction from Constraints', () => {
    it('should extract field from unique constraint', () => {
      const postgrestError = {
        message: 'duplicate key',
        details: 'Key (vin)=(WDB123) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.field).toBe('vin');
      expect(result.message).toBe('Автомобиль с таким VIN уже существует');
    });

    it('should extract field from column constraint', () => {
      const postgrestError = {
        message: 'constraint violation',
        details: 'Failing column "name"',
        hint: null,
        code: '23502',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.field).toBe('name');
    });
  });

  // ============================================================================
  // User-Friendly Messages
  // ============================================================================

  describe('User-Friendly Messages', () => {
    it('should provide friendly message for license_plate unique violation', () => {
      const postgrestError = {
        message: 'duplicate',
        details: 'Key (license_plate)=(B-AB 1234) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.message).toBe('Автомобиль с таким номером уже существует');
    });

    it('should provide friendly message for email unique violation', () => {
      const postgrestError = {
        message: 'duplicate',
        details: 'Key (email)=(user@test.com) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.message).toBe('Пользователь с таким email уже существует');
    });

    it('should provide friendly message for vin unique violation', () => {
      const postgrestError = {
        message: 'duplicate',
        details: 'Key (vin)=(WDB123) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.message).toBe('Автомобиль с таким VIN уже существует');
    });

    it('should provide friendly message for name unique violation', () => {
      const postgrestError = {
        message: 'duplicate',
        details: 'Key (name)=(Test Name) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.message).toBe('Запись с таким названием уже существует');
    });

    it('should provide generic message for unknown field', () => {
      const postgrestError = {
        message: 'duplicate',
        details: 'Key (custom_field)=(value) already exists.',
        hint: null,
        code: '23505',
      };

      const result = parseSupabaseError(postgrestError as any);

      expect(result.message).toContain('custom_field');
      expect(result.message).toContain('уникальным');
    });
  });
});

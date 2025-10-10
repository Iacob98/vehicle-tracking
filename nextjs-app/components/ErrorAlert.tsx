'use client';

/**
 * ErrorAlert Component
 * Компонент для отображения ошибок с интеграцией централизованной системы обработки ошибок
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppError, ErrorType } from '@/lib/errors';
import { AlertCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ErrorAlertProps {
  error: AppError | string | null;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({ error, title, onDismiss, className }: ErrorAlertProps) {
  if (!error) return null;

  // Преобразуем string ошибку в AppError
  const appError: AppError = typeof error === 'string'
    ? { type: ErrorType.UNKNOWN, message: error }
    : error;

  // Определяем вариант alert на основе типа ошибки
  const getVariant = (type: ErrorType): 'destructive' | 'warning' | 'default' | 'info' => {
    switch (type) {
      case ErrorType.VALIDATION:
      case ErrorType.FILE_SIZE:
      case ErrorType.FILE_TYPE:
        return 'warning';

      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.RLS_POLICY:
        return 'destructive';

      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return 'info';

      case ErrorType.DATABASE:
      case ErrorType.UNIQUE_VIOLATION:
      case ErrorType.FOREIGN_KEY_VIOLATION:
      case ErrorType.CHECK_VIOLATION:
      case ErrorType.NOT_NULL_VIOLATION:
      case ErrorType.FILE_UPLOAD:
      case ErrorType.BUSINESS_LOGIC:
      case ErrorType.UNKNOWN:
      default:
        return 'destructive';
    }
  };

  // Определяем иконку на основе типа ошибки
  const getIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.VALIDATION:
      case ErrorType.FILE_SIZE:
      case ErrorType.FILE_TYPE:
        return <AlertTriangle className="h-4 w-4" />;

      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
      case ErrorType.RLS_POLICY:
        return <XCircle className="h-4 w-4" />;

      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return <Info className="h-4 w-4" />;

      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Определяем заголовок по умолчанию на основе типа ошибки
  const getDefaultTitle = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.VALIDATION:
        return 'Ошибка валидации';
      case ErrorType.AUTHENTICATION:
        return 'Ошибка авторизации';
      case ErrorType.AUTHORIZATION:
      case ErrorType.RLS_POLICY:
        return 'Доступ запрещен';
      case ErrorType.DATABASE:
      case ErrorType.UNIQUE_VIOLATION:
      case ErrorType.FOREIGN_KEY_VIOLATION:
      case ErrorType.CHECK_VIOLATION:
      case ErrorType.NOT_NULL_VIOLATION:
        return 'Ошибка базы данных';
      case ErrorType.NETWORK:
        return 'Ошибка сети';
      case ErrorType.TIMEOUT:
        return 'Превышено время ожидания';
      case ErrorType.FILE_UPLOAD:
      case ErrorType.FILE_SIZE:
      case ErrorType.FILE_TYPE:
        return 'Ошибка загрузки файла';
      case ErrorType.BUSINESS_LOGIC:
        return 'Ошибка бизнес-логики';
      default:
        return 'Произошла ошибка';
    }
  };

  const variant = getVariant(appError.type);
  const icon = getIcon(appError.type);
  const defaultTitle = getDefaultTitle(appError.type);

  return (
    <Alert variant={variant} className={className}>
      {icon}
      <AlertTitle>{title || defaultTitle}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{appError.message}</p>
          {appError.details && (
            <p className="text-xs opacity-80">{appError.details}</p>
          )}
          {appError.field && (
            <p className="text-xs opacity-80">Поле: {appError.field}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Закрыть"
          >
            ×
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Хук для управления ошибками в компонентах
export function useErrorHandler() {
  const [error, setError] = React.useState<AppError | null>(null);

  const handleError = React.useCallback((err: unknown) => {
    if (typeof err === 'string') {
      setError({ type: ErrorType.UNKNOWN, message: err });
    } else if (err && typeof err === 'object' && 'type' in err) {
      setError(err as AppError);
    } else if (err instanceof Error) {
      setError({ type: ErrorType.UNKNOWN, message: err.message });
    } else {
      setError({ type: ErrorType.UNKNOWN, message: 'Произошла неизвестная ошибка' });
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// Компонент для отображения ошибок из API response
export interface ApiErrorAlertProps {
  response: Response | null;
  errorData?: { error?: string; type?: ErrorType; details?: string; field?: string };
  onDismiss?: () => void;
  className?: string;
}

export function ApiErrorAlert({ response, errorData, onDismiss, className }: ApiErrorAlertProps) {
  if (!response || response.ok) return null;

  const appError: AppError = {
    type: errorData?.type || ErrorType.UNKNOWN,
    message: errorData?.error || 'Произошла ошибка при обращении к серверу',
    details: errorData?.details,
    field: errorData?.field,
  };

  return <ErrorAlert error={appError} onDismiss={onDismiss} className={className} />;
}

import React from 'react';

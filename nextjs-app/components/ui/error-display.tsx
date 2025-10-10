'use client';

import { AppError, ErrorType } from '@/lib/errors';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface ErrorDisplayProps {
  error: AppError | null;
  className?: string;
  showDetails?: boolean;
}

// ============================================================================
// ERROR DISPLAY COMPONENT
// ============================================================================

export function ErrorDisplay({ error, className = '', showDetails = false }: ErrorDisplayProps) {
  if (!error) return null;

  const { icon, bgColor, borderColor, textColor, title } = getErrorStyle(error.type);

  return (
    <div
      className={`rounded-lg border p-4 ${bgColor} ${borderColor} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${textColor}`}>{icon}</div>
        <div className="flex-1">
          <h3 className={`font-semibold ${textColor}`}>{title}</h3>
          <p className="mt-1 text-sm">{error.message}</p>
          {showDetails && error.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Технические детали
              </summary>
              <p className="mt-1 text-xs text-gray-600">{error.details}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INLINE ERROR (для полей форм)
// ============================================================================

interface InlineErrorProps {
  message?: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  if (!message) return null;

  return (
    <p className={`text-sm text-red-600 mt-1 flex items-center gap-1 ${className}`}>
      <XCircle className="w-4 h-4" />
      {message}
    </p>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getErrorStyle(type: ErrorType): {
  icon: ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  title: string;
} {
  switch (type) {
    case ErrorType.VALIDATION:
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        title: 'Проверьте введенные данные',
      };

    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
    case ErrorType.RLS_POLICY:
      return {
        icon: <XCircle className="w-5 h-5" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Ошибка доступа',
      };

    case ErrorType.DATABASE:
    case ErrorType.UNIQUE_VIOLATION:
    case ErrorType.FOREIGN_KEY_VIOLATION:
    case ErrorType.CHECK_VIOLATION:
    case ErrorType.NOT_NULL_VIOLATION:
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        title: 'Ошибка сохранения данных',
      };

    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        title: 'Проблемы с подключением',
      };

    case ErrorType.FILE_UPLOAD:
    case ErrorType.FILE_SIZE:
    case ErrorType.FILE_TYPE:
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        title: 'Ошибка загрузки файла',
      };

    case ErrorType.BUSINESS_LOGIC:
      return {
        icon: <Info className="w-5 h-5" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        title: 'Невозможно выполнить операцию',
      };

    default:
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        title: 'Произошла ошибка',
      };
  }
}

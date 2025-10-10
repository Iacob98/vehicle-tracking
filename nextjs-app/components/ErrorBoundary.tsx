'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorType, formatError, logError } from '@/lib/errors';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
}

interface State {
  error: AppError | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary компонент для перехвата ошибок в React дереве
 *
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * @example с кастомным fallback
 * <ErrorBoundary fallback={(error, reset) => <CustomError error={error} onReset={reset} />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Обновляем state, чтобы следующий рендер показал fallback UI
    return {
      error: formatError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку
    const appError = formatError(error);
    logError(appError, {
      componentStack: errorInfo.componentStack,
    });

    // Сохраняем errorInfo в state
    this.setState({
      errorInfo,
    });

    // Вызываем callback если предоставлен
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  reset = () => {
    this.setState({
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.error) {
      // Если предоставлен кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Иначе показываем стандартный UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4">
            <ErrorDisplay
              error={this.state.error}
              showDetails={process.env.NODE_ENV === 'development'}
            />

            <div className="flex gap-3">
              <Button onClick={this.reset} className="flex-1">
                🔄 Попробовать снова
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1"
              >
                🏠 На главную
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer font-medium">
                  Component Stack (dev only)
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// HOC для оборачивания компонентов в ErrorBoundary
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: AppError, reset: () => void) => ReactNode
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

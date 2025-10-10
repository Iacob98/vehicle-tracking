'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatError, logError } from '@/lib/errors';
import { ErrorDisplay } from '@/components/ui/error-display';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку
    const appError = formatError(error);
    logError(appError, {
      digest: error.digest,
      page: 'dashboard',
    });
  }, [error]);

  const appError = formatError(error);

  return (
    <div className="flex items-center justify-center p-6 min-h-[600px]">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ошибка загрузки страницы
          </h2>
          <p className="text-gray-600">
            Не удалось загрузить содержимое этой страницы
          </p>
        </div>

        <ErrorDisplay
          error={appError}
          showDetails={process.env.NODE_ENV === 'development'}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={reset} className="flex-1">
            🔄 Попробовать снова
          </Button>
          <Link href="/dashboard" className="flex-1">
            <Button variant="outline" className="w-full">
              🏠 Панель управления
            </Button>
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && error.stack && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium mb-2">
              Stack Trace (dev only)
            </summary>
            <pre className="p-2 bg-gray-100 rounded overflow-auto text-xs">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

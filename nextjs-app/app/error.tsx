'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatError, logError } from '@/lib/errors';
import { ErrorDisplay } from '@/components/ui/error-display';

export default function Error({
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
      page: 'global',
    });
  }, [error]);

  const appError = formatError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Упс!</h1>
          <p className="text-gray-600">Что-то пошло не так</p>
        </div>

        <ErrorDisplay
          error={appError}
          showDetails={process.env.NODE_ENV === 'development'}
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={reset} className="flex-1">
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

        {process.env.NODE_ENV === 'development' && error.digest && (
          <div className="text-xs text-gray-500 text-center">
            Error Digest: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}

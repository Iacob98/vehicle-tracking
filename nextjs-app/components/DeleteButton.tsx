'use client';

/**
 * DeleteButton Component
 * Переиспользуемый компонент для удаления записей
 *
 * Интегрирован с централизованной системой обработки ошибок:
 * - Использует useDelete хук из lib/api-client.ts
 * - Отображает ErrorAlert при ошибках
 * - Показывает confirm dialog
 * - Имеет loading состояние
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useDelete } from '@/lib/api-client';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface DeleteButtonProps {
  /** API endpoint для удаления (например: /api/vehicles/123) */
  apiEndpoint: string;
  /** Название сущности для отображения в тексте (например: "автомобиль") */
  itemName: string;
  /** URL для редиректа после успешного удаления */
  redirectUrl?: string;
  /** Дополнительный текст для подтверждения */
  confirmMessage?: string;
  /** Варианты кнопки */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Размер кнопки */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Показывать только иконку */
  iconOnly?: boolean;
  /** Дополнительные CSS классы */
  className?: string;
  /** Callback после успешного удаления */
  onSuccess?: () => void;
  /** Callback при ошибке */
  onError?: (error: any) => void;
}

export function DeleteButton({
  apiEndpoint,
  itemName,
  redirectUrl,
  confirmMessage,
  variant = 'destructive',
  size = 'default',
  iconOnly = false,
  className = '',
  onSuccess,
  onError,
}: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { loading, error, deleteItem, clearError } = useDelete(apiEndpoint, {
    onSuccess: () => {
      setOpen(false);
      if (redirectUrl) {
        router.push(redirectUrl);
        router.refresh();
      }
      onSuccess?.();
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleDelete = async () => {
    await deleteItem();
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorAlert error={error} onDismiss={clearError} />
        </div>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {!iconOnly && <span className="ml-2">Удалить</span>}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage || `Вы уверены, что хотите удалить ${itemName}?`}
              <br />
              <strong className="text-red-600">Это действие необратимо.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Пример использования:
 *
 * <DeleteButton
 *   apiEndpoint={`/api/vehicles/${vehicleId}`}
 *   itemName="автомобиль Mercedes Sprinter"
 *   redirectUrl="/dashboard/vehicles"
 *   confirmMessage="Вы уверены, что хотите удалить этот автомобиль? Все связанные данные будут потеряны."
 *   onSuccess={() => toast.success('Автомобиль удален')}
 * />
 */

'use client';

/**
 * DeleteItemButton Component
 * Универсальная кнопка удаления с динамическим ID
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { useDeleteJSON } from '@/lib/api-client';

interface DeleteItemButtonProps {
  id: string;
  baseUrl: string; // e.g., '/api/users'
  itemName: string; // e.g., 'пользователя "Иван Иванов"'
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonText?: string;
  onSuccess?: () => void;
}

export function DeleteItemButton({
  id,
  baseUrl,
  itemName,
  size = 'sm',
  variant = 'outline',
  buttonText = '🗑️',
  onSuccess,
}: DeleteItemButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { del, loading, error } = useDeleteJSON(baseUrl, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
      onSuccess?.();
    },
  });

  const handleDelete = async () => {
    await del(id);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        title="Удалить"
      >
        {buttonText}
      </Button>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleDelete}
        title="Подтвердите удаление"
        description={`Вы уверены, что хотите удалить ${itemName}? Это действие нельзя отменить.`}
        isDeleting={loading}
      />
    </>
  );
}

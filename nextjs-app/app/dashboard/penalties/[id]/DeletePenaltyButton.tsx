'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DeletePenaltyButtonProps {
  penaltyId: string;
}

export default function DeletePenaltyButton({ penaltyId }: DeletePenaltyButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Удалить этот штраф? / Diese Strafe löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/penalties/${penaltyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete penalty');
      }

      router.push('/dashboard/penalties');
      router.refresh();
    } catch (error) {
      console.error('Error deleting penalty:', error);
      alert('Ошибка удаления штрафа');
    }
  };

  return (
    <Button variant="outline" onClick={handleDelete}>
      🗑️ Удалить
    </Button>
  );
}

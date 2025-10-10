'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON, useDelete } from '@/lib/api-client';
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

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  category?: string;
  created_at: string;
}

interface TeamMembersProps {
  teamId: string;
  orgId: string;
  initialMembers: TeamMember[];
}

export default function TeamMembers({ teamId, orgId, initialMembers }: TeamMembersProps) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Используем централизованную обработку ошибок через API hooks
  const { loading: addLoading, error: addError, post } = usePostJSON('/api/team-members', {
    onSuccess: (data) => {
      setMembers([...members, data.member]);
      setShowAddForm(false);
      router.refresh();
    },
  });

  const { loading: deleteLoading, error: deleteError, deleteItem } = useDelete(
    memberToDelete ? `/api/team-members/${memberToDelete}` : '',
    {
      onSuccess: () => {
        setMembers(members.filter(m => m.id !== memberToDelete));
        setMemberToDelete(null);
        setDeleteDialogOpen(false);
        router.refresh();
      },
    }
  );

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    await post({
      team_id: teamId,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string || null,
      category: formData.get('category') as string || null,
    });

    // Сброс формы только при успехе (post автоматически вызовет onSuccess)
    if (!addError) {
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleDeleteClick = (memberId: string) => {
    setMemberToDelete(memberId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (memberToDelete) {
      await deleteItem();
    }
  };

  return (
    <div className="space-y-4">
      {/* Показываем ошибки добавления и удаления */}
      {addError && <ErrorAlert error={addError} />}
      {deleteError && <ErrorAlert error={deleteError} />}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Участники бригады</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '❌ Отмена' : '➕ Добавить участника'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-white border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Имя *</label>
              <Input
                type="text"
                name="first_name"
                required
                placeholder="Введите имя"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Фамилия *</label>
              <Input
                type="text"
                name="last_name"
                required
                placeholder="Введите фамилию"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Телефон</label>
              <Input
                type="text"
                name="phone"
                placeholder="+7 xxx xxx xx xx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Категория</label>
              <select
                name="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Не указана</option>
                <option value="driver">Водитель</option>
                <option value="mechanic">Механик</option>
                <option value="helper">Помощник</option>
                <option value="supervisor">Супервайзер</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={addLoading}>
            {addLoading ? 'Добавление...' : '💾 Добавить'}
          </Button>
        </form>
      )}

      {members && members.length > 0 ? (
        <div className="bg-white border rounded-lg divide-y">
          {members.map((member) => (
            <div key={member.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    {member.first_name} {member.last_name}
                  </h3>
                  {member.phone && (
                    <p className="text-sm text-gray-600">📞 {member.phone}</p>
                  )}
                  {member.category && (
                    <p className="text-sm text-gray-500">
                      Категория: {member.category}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(member.id)}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500">Нет участников в бригаде</p>
          <Button className="mt-4" onClick={() => setShowAddForm(true)}>
            ➕ Добавить первого участника
          </Button>
        </div>
      )}

      {/* AlertDialog для подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить участника из бригады?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Участник будет удален из бригады.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [loading, setLoading] = useState(false);

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          organization_id: orgId,
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          phone: formData.get('phone'),
          category: formData.get('category'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member');
      }

      const { member } = await response.json();
      setMembers([...members, member]);
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Ошибка добавления участника');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Удалить участника из бригады?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      setMembers(members.filter(m => m.id !== memberId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Ошибка удаления участника');
    }
  };

  return (
    <div className="space-y-4">
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Добавление...' : '💾 Добавить'}
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
                    onClick={() => handleDeleteMember(member.id)}
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
    </div>
  );
}

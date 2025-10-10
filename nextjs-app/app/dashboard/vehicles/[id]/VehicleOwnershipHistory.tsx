'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorAlert } from '@/components/ErrorAlert';
import { usePostJSON, useDelete } from '@/lib/api-client';

interface OwnershipRecord {
  id: string;
  vehicle_id: string;
  owner_name: string;
  owner_type: 'individual' | 'company' | 'organization';
  owner_contact?: string;
  owner_address?: string;
  start_date: string;
  end_date?: string;
  purchase_price?: number;
  sale_price?: number;
  document_number?: string;
  notes?: string;
  created_at: string;
}

interface VehicleOwnershipHistoryProps {
  vehicleId: string;
  vehicleName: string;
  initialOwnershipHistory: OwnershipRecord[];
}

const OWNER_TYPES = [
  { value: 'individual', label: '👤 Физическое лицо' },
  { value: 'company', label: '🏢 Юридическое лицо' },
  { value: 'organization', label: '🏛️ Организация' },
];

export function VehicleOwnershipHistory({
  vehicleId,
  vehicleName,
  initialOwnershipHistory,
}: VehicleOwnershipHistoryProps) {
  const router = useRouter();
  const [ownershipHistory, setOwnershipHistory] = useState<OwnershipRecord[]>(initialOwnershipHistory);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // API hooks
  const { loading: createLoading, error: createError, post } = usePostJSON('/api/vehicle-ownership', {
    onSuccess: (data) => {
      setOwnershipHistory([data.ownership, ...ownershipHistory]);
      setShowForm(false);
      router.refresh();
    },
  });

  const { loading: deleteLoading, error: deleteError, deleteItem } = useDelete(
    recordToDelete ? `/api/vehicle-ownership/${recordToDelete}` : '',
    {
      onSuccess: () => {
        setOwnershipHistory(ownershipHistory.filter((r) => r.id !== recordToDelete));
        setDeleteDialogOpen(false);
        setRecordToDelete(null);
        router.refresh();
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await post({
      vehicle_id: vehicleId,
      owner_name: formData.get('owner_name') as string,
      owner_type: formData.get('owner_type') as string,
      owner_contact: formData.get('owner_contact') as string || null,
      owner_address: formData.get('owner_address') as string || null,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || null,
      purchase_price: formData.get('purchase_price') ? parseFloat(formData.get('purchase_price') as string) : null,
      sale_price: formData.get('sale_price') ? parseFloat(formData.get('sale_price') as string) : null,
      document_number: formData.get('document_number') as string || null,
      notes: formData.get('notes') as string || null,
    });
  };

  const handleDeleteClick = (recordId: string) => {
    setRecordToDelete(recordId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (recordToDelete) {
      await deleteItem();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const calculateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0) {
      return remainingMonths > 0
        ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${remainingMonths} ${remainingMonths === 1 ? 'месяц' : remainingMonths < 5 ? 'месяца' : 'месяцев'}`
        : `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    }
    return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">📜 История владения</h2>
          <p className="text-gray-600">{vehicleName}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? '❌ Отмена' : '➕ Добавить владельца'}
        </Button>
      </div>

      {createError && <ErrorAlert error={createError} />}
      {deleteError && <ErrorAlert error={deleteError} />}

      {/* Форма добавления владельца */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="owner_name">Владелец *</Label>
              <Input
                id="owner_name"
                name="owner_name"
                placeholder="ФИО или название организации"
                required
              />
            </div>

            <div>
              <Label htmlFor="owner_type">Тип владельца *</Label>
              <Select name="owner_type" defaultValue="individual" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Дата начала владения *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                required
              />
            </div>

            <div>
              <Label htmlFor="end_date">Дата окончания владения</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
              />
              <p className="text-xs text-gray-500 mt-1">Оставьте пустым если это текущий владелец</p>
            </div>

            <div>
              <Label htmlFor="purchase_price">Цена покупки (₽)</Label>
              <Input
                id="purchase_price"
                name="purchase_price"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="sale_price">Цена продажи (₽)</Label>
              <Input
                id="sale_price"
                name="sale_price"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="owner_contact">Контакт</Label>
              <Input
                id="owner_contact"
                name="owner_contact"
                placeholder="Телефон или email"
              />
            </div>

            <div>
              <Label htmlFor="document_number">Номер договора</Label>
              <Input
                id="document_number"
                name="document_number"
                placeholder="№ договора купли-продажи"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="owner_address">Адрес владельца</Label>
              <Input
                id="owner_address"
                name="owner_address"
                placeholder="Полный адрес"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Заметки</Label>
              <textarea
                id="notes"
                name="notes"
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Дополнительная информация"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={createLoading}>
              {createLoading ? 'Сохранение...' : '✅ Добавить'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {/* Список владельцев */}
      {ownershipHistory.length > 0 ? (
        <div className="space-y-4">
          {ownershipHistory.map((record) => (
            <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{record.owner_name}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {OWNER_TYPES.find((t) => t.value === record.owner_type)?.label}
                    </span>
                    {!record.end_date && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        ✓ Текущий владелец
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">📅 Период владения:</span>
                      <div className="font-medium">
                        {formatDate(record.start_date)} — {record.end_date ? formatDate(record.end_date) : 'по настоящее время'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        ({calculateDuration(record.start_date, record.end_date)})
                      </div>
                    </div>

                    {(record.purchase_price || record.sale_price) && (
                      <div>
                        <span className="text-gray-600">💰 Финансы:</span>
                        {record.purchase_price && (
                          <div className="font-medium">Покупка: {record.purchase_price.toLocaleString('ru-RU')} ₽</div>
                        )}
                        {record.sale_price && (
                          <div className="font-medium">Продажа: {record.sale_price.toLocaleString('ru-RU')} ₽</div>
                        )}
                      </div>
                    )}

                    {record.owner_contact && (
                      <div>
                        <span className="text-gray-600">📞 Контакт:</span>
                        <div className="font-medium">{record.owner_contact}</div>
                      </div>
                    )}

                    {record.document_number && (
                      <div>
                        <span className="text-gray-600">📄 Договор:</span>
                        <div className="font-medium">{record.document_number}</div>
                      </div>
                    )}

                    {record.owner_address && (
                      <div className="col-span-2">
                        <span className="text-gray-600">📍 Адрес:</span>
                        <div className="font-medium">{record.owner_address}</div>
                      </div>
                    )}

                    {record.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-600">📝 Заметки:</span>
                        <div className="text-gray-700">{record.notes}</div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(record.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📜</div>
          <p>История владения пуста</p>
          <p className="text-sm">Добавьте информацию о владельцах этого автомобиля</p>
        </div>
      )}

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись истории?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Запись будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? 'Удаление...' : '🗑️ Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

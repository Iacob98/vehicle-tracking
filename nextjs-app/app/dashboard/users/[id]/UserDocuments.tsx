'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { usePostFormData, useDelete } from '@/lib/api-client';
import { DocumentViewer } from '@/app/dashboard/vehicles/[id]/DocumentViewer';

interface Document {
  id: string;
  document_type: string;
  title: string;
  file_url?: string;
  date_issued?: string;
  date_expiry?: string;
}

interface UserDocumentsProps {
  userId: string;
  userName: string;
  initialDocuments: Document[];
}

const DOCUMENT_TYPES = {
  passport: { name: '🆔 Паспорт / Reisepass', value: 'passport' },
  driving_license: { name: '🚗 Водительские права / Führerschein', value: 'driving_license' },
  medical_certificate: { name: '🏥 Медицинская справка / Ärztliches Zeugnis', value: 'medical_certificate' },
  work_permit: { name: '💼 Разрешение на работу / Arbeitserlaubnis', value: 'work_permit' },
  visa: { name: '✈️ Виза / Visum', value: 'visa' },
  insurance: { name: '🛡️ Страховка / Versicherung', value: 'insurance' },
};

export default function UserDocuments({ userId, userName, initialDocuments }: UserDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  // Используем централизованную обработку ошибок через API hooks
  const { loading: addLoading, error: addError, post } = usePostFormData('/api/user-documents', {
    onSuccess: (data) => {
      setDocuments([data.document, ...documents]);
      setFile(null);
      setShowAddForm(false);
      router.refresh();
    },
  });

  const { loading: deleteLoading, error: deleteError, deleteItem } = useDelete(
    docToDelete ? `/api/user-documents/${docToDelete}` : '',
    {
      onSuccess: () => {
        setDocuments(documents.filter(d => d.id !== docToDelete));
        setDocToDelete(null);
        setDeleteDialogOpen(false);
        router.refresh();
      },
    }
  );

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append('user_id', userId);

    if (file) {
      formData.append('file', file);
    }

    await post(formData);

    // Сброс формы только при успехе
    if (!addError) {
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleDeleteClick = (docId: string) => {
    setDocToDelete(docId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (docToDelete) {
      await deleteItem();
    }
  };

  const getDocumentStatus = (doc: Document) => {
    if (!doc.date_expiry) return { text: 'Срок не указан', color: 'text-gray-500' };

    const today = new Date();
    const expiryDate = new Date(doc.date_expiry);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { text: `⚠️ Просрочен`, color: 'text-red-600' };
    } else if (daysUntilExpiry <= 30) {
      return { text: `⚠️ Истекает через ${daysUntilExpiry} дней`, color: 'text-orange-600' };
    } else {
      return { text: `✅ До ${expiryDate.toLocaleDateString('ru-RU')}`, color: 'text-green-600' };
    }
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="space-y-4">
      {/* Показываем ошибки добавления и удаления */}
      {addError && <ErrorAlert error={addError} />}
      {deleteError && <ErrorAlert error={deleteError} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📄 Документы пользователя</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '❌ Отмена' : '➕ Добавить документ'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddDocument} className="bg-white border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                📋 Тип документа *
              </label>
              <select
                name="document_type"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                  <option key={key} value={type.value}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                📄 Название *
              </label>
              <Input
                type="text"
                name="title"
                required
                placeholder="Например: Паспорт серия 1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                📅 Дата выдачи
              </label>
              <Input
                type="date"
                name="issue_date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ⏰ Срок действия до
              </label>
              <Input
                type="date"
                name="expiry_date"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                📎 Файл
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <Button type="submit" disabled={addLoading}>
            {addLoading ? 'Добавление...' : '💾 Добавить документ'}
          </Button>
        </form>
      )}

      {/* Document List Grouped by Type */}
      {Object.keys(groupedDocs).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([type, docs]) => {
            const typeInfo = DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES] || { name: type };
            return (
              <div key={type}>
                <h3 className="text-lg font-semibold mb-3">{typeInfo.name}</h3>
                <div className="bg-white border rounded-lg divide-y">
                  {docs.map((doc) => {
                    const status = getDocumentStatus(doc);
                    return (
                      <div key={doc.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{doc.title}</h4>
                            {doc.date_issued && (
                              <p className="text-sm text-gray-600 mt-1">
                                📅 Выдан: {new Date(doc.date_issued).toLocaleDateString('ru-RU')}
                              </p>
                            )}
                            <p className={`text-sm font-medium mt-1 ${status.color}`}>
                              {status.text}
                            </p>
                            {doc.file_url && (
                              <p className="text-sm text-blue-600 mt-1">📎 Файл прикреплен</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {doc.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingDoc({ url: doc.file_url!, name: doc.title })}
                              >
                                👁️ Просмотр
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(doc.id)}
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500 mb-4">Нет документов для {userName}</p>
          <Button onClick={() => setShowAddForm(true)}>
            ➕ Добавить первый документ
          </Button>
        </div>
      )}

      {/* Document Viewer */}
      {viewingDoc && (
        <DocumentViewer
          fileUrl={viewingDoc.url}
          fileName={viewingDoc.name}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* AlertDialog для подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Документ будет удален.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocToDelete(null)}>
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

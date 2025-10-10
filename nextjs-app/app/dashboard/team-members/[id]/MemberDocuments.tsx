'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentViewer } from '@/app/dashboard/vehicles/[id]/DocumentViewer';

interface Document {
  id: string;
  title: string;
  file_url?: string;
  upload_date: string;
  expiry_date?: string;
}

interface MemberDocumentsProps {
  memberId: string;
  memberName: string;
  initialDocuments: Document[];
}

const DOCUMENT_TYPES = {
  "🆔 Паспорт / Reisepass": "Паспорт",
  "🚗 Водительские права / Führerschein": "Водительские права",
  "💼 Разрешение на работу / Arbeitserlaubnis": "Разрешение на работу",
  "🏠 Вид на жительство / Aufenthaltstitel": "Вид на жительство",
  "🏥 Медицинская страховка / Krankenversicherung": "Медицинская страховка",
  "📍 Регистрация по месту жительства / Anmeldung": "Регистрация по месту жительства",
  "💰 Налоговый номер / Steuer-ID": "Налоговый номер",
  "👥 Социальное страхование / Sozialversicherungsausweis": "Социальное страхование",
  "📋 Трудовой договор / Arbeitsvertrag": "Трудовой договор",
  "🎓 Квалификация / Qualifikation": "Квалификация",
  "📝 Другой документ / Sonstiges": "Другой документ"
};

export default function MemberDocuments({ memberId, memberName, initialDocuments }: MemberDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const docType = formData.get('document_type') as string;

    let title = DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES];
    if (docType === "📝 Другой документ / Sonstiges") {
      title = customTitle || "Другой документ";
    }

    formData.append('team_member_id', memberId);
    formData.append('title', title);

    // Add files
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/team-member-documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add document');
      }

      const { document } = await response.json();
      setDocuments([document, ...documents]);
      setFiles([]);
      setCustomTitle('');
      setShowAddForm(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error: any) {
      console.error('Error adding document:', error);
      alert(error.message || 'Ошибка добавления документа');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Удалить документ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team-member-documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(documents.filter(d => d.id !== docId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Ошибка удаления документа');
    }
  };

  const getDocumentStatus = (doc: Document) => {
    if (!doc.expiry_date) return { text: 'Срок не указан', color: 'text-gray-500' };

    const today = new Date();
    const expiryDate = new Date(doc.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { text: `⚠️ Просрочен`, color: 'text-red-600' };
    } else if (daysUntilExpiry <= 30) {
      return { text: `⚠️ Истекает через ${daysUntilExpiry} дней`, color: 'text-orange-600' };
    } else {
      return { text: `✅ До ${expiryDate.toLocaleDateString('ru-RU')}`, color: 'text-green-600' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📄 Документы</h2>
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
                onChange={(e) => {
                  if (e.target.value !== "📝 Другой документ / Sonstiges") {
                    setCustomTitle('');
                  }
                }}
              >
                {Object.keys(DOCUMENT_TYPES).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                📅 Срок действия до
              </label>
              <Input
                type="date"
                name="expiry_date"
              />
            </div>
          </div>

          {customTitle !== undefined && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Название документа *
              </label>
              <Input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Введите название"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              📎 Файлы
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {files.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Выбрано файлов: {files.length}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Добавление...' : '💾 Добавить документ'}
          </Button>
        </form>
      )}

      {/* Document List */}
      {documents && documents.length > 0 ? (
        <div className="bg-white border rounded-lg divide-y">
          {documents.map((doc) => {
            const status = getDocumentStatus(doc);
            return (
              <div key={doc.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{doc.title}</h3>
                    <p className="text-sm text-gray-600">
                      📅 Загружен: {new Date(doc.upload_date).toLocaleDateString('ru-RU')}
                    </p>
                    <p className={`text-sm font-medium ${status.color}`}>
                      {status.text}
                    </p>
                    {doc.file_url ? (
                      <p className="text-sm text-blue-600 mt-1">
                        📎 {doc.file_url.split(';').length} файл(ов)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">
                        📎 Файлы не прикреплены
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {doc.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const firstFile = doc.file_url!.split(';')[0];
                          setViewingDoc({ url: firstFile, name: doc.title });
                        }}
                      >
                        👁️ Просмотр
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <p className="text-gray-500 mb-4">Нет документов для {memberName}</p>
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
    </div>
  );
}

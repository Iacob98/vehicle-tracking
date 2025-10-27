'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DocumentViewer } from '@/app/dashboard/vehicles/[id]/DocumentViewer';

interface Document {
  id: string;
  document_type: string;
  title: string;
  file_url?: string;
  date_issued?: string;
  date_expiry?: string;
}

interface DriverDocumentsViewProps {
  documents: Document[];
}

const DOCUMENT_TYPES = {
  passport: { name: '🆔 Паспорт / Reisepass', value: 'passport' },
  driving_license: { name: '🚗 Водительские права / Führerschein', value: 'driving_license' },
  medical_certificate: { name: '🏥 Медицинская справка / Ärztliches Zeugnis', value: 'medical_certificate' },
  work_permit: { name: '💼 Разрешение на работу / Arbeitserlaubnis', value: 'work_permit' },
  visa: { name: '✈️ Виза / Visum', value: 'visa' },
  insurance: { name: '🛡️ Страховка / Versicherung', value: 'insurance' },
};

export function DriverDocumentsView({ documents }: DriverDocumentsViewProps) {
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string } | null>(null);

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
          <p className="text-gray-500 mb-2">Документы еще не загружены</p>
          <p className="text-sm text-gray-400">
            Обратитесь к администратору для загрузки ваших документов
          </p>
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

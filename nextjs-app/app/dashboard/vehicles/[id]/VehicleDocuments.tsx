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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadMultipleFiles } from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { DocumentViewer } from './DocumentViewer';

interface VehicleDocumentsProps {
  vehicle: {
    id: string;
    name: string;
    license_plate: string | null;
    vin: string | null;
    model: string | null;
    year: number | null;
    status: string;
    photo_url: string | null;
    is_rental: boolean | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    rental_monthly_price: number | null;
    organization_id: string;
  };
  initialDocuments: Array<{
    id: string;
    document_type: string;
    title: string;
    date_issued: string | null;
    date_expiry: string | null;
    file_url: string | null;
    is_active: boolean;
  }>;
}

const DOCUMENT_TYPES = [
  { value: 'insurance', label: '🛡️ Страховка / Versicherung' },
  { value: 'inspection', label: '🔧 Техосмотр / TÜV' },
  { value: 'registration', label: '📋 Регистрация / Zulassung' },
  { value: 'license', label: '📜 Лицензия / Lizenz' },
  { value: 'permit', label: '✅ Разрешение / Genehmigung' },
  { value: 'rental_contract', label: '🏢 Договор аренды / Mietvertrag' },
];

export function VehicleDocuments({ vehicle, initialDocuments }: VehicleDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  // Calculate document status
  const getDocumentStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: '✓ Действителен', color: 'text-green-600', bgColor: 'bg-green-50' };

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { label: '❌ Просрочен', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (daysUntilExpiry <= 30) {
      return { label: `⚠️ Истекает (${daysUntilExpiry} дн.)`, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    } else {
      return { label: '✓ Действителен', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocumentFiles(files);
  };

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      // Add vehicle_id and files to formData
      formData.append('vehicle_id', vehicle.id);

      // Add all document files
      documentFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Call API route instead of direct Supabase call
      const response = await fetch('/api/vehicle-documents', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add document');
      }

      setDocuments([...documents, result.document]);
      setDocumentFiles([]);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: any) {
      console.error('Error adding document:', err);
      setError(err.message || 'Ошибка добавления документа');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Удалить этот документ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('vehicle_documents')
        .update({ is_active: false })
        .eq('id', docId)
        .eq('organization_id', vehicle.organization_id);

      if (deleteError) throw deleteError;

      setDocuments(documents.filter((doc) => doc.id !== docId));
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert('Ошибка удаления документа');
    }
  };

  // Calculate statistics
  const stats = {
    total: documents.length,
    expired: documents.filter((doc) => {
      if (!doc.date_expiry) return false;
      return new Date(doc.date_expiry) < new Date();
    }).length,
    expiring: documents.filter((doc) => {
      if (!doc.date_expiry) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(doc.date_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/vehicles')}
            className="mb-4"
          >
            ← Назад к списку
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">🚗 {vehicle.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}/edit`)}
          >
            ✏️ Редактировать
          </Button>
        </div>
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Гос. номер:</span>
              <p className="font-semibold">{vehicle.license_plate || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">VIN:</span>
              <p className="font-semibold">{vehicle.vin || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Модель:</span>
              <p className="font-semibold">{vehicle.model || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Год:</span>
              <p className="font-semibold">{vehicle.year || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Статус:</span>
              <p className="font-semibold">
                {vehicle.status === 'active' && '🟢 Активен'}
                {vehicle.status === 'repair' && '🔧 Ремонт'}
                {vehicle.status === 'unavailable' && '🔴 Недоступен'}
                {vehicle.status === 'rented' && '🏢 Аренда'}
              </p>
            </div>
          </div>

          {vehicle.photo_url && (
            <div>
              <div className="relative w-full h-48">
                <Image
                  src={vehicle.photo_url.split(';')[0]}
                  alt={vehicle.name}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rental Info */}
        {vehicle.is_rental && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">🏢 Информация об аренде</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-500">Начало аренды:</span>
                <p className="font-semibold">
                  {vehicle.rental_start_date
                    ? new Date(vehicle.rental_start_date).toLocaleDateString('ru-RU')
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Окончание аренды:</span>
                <p className="font-semibold">
                  {vehicle.rental_end_date
                    ? new Date(vehicle.rental_end_date).toLocaleDateString('ru-RU')
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Стоимость (€/мес):</span>
                <p className="font-semibold">
                  {vehicle.rental_monthly_price
                    ? `€${vehicle.rental_monthly_price.toFixed(2)}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          <div className="text-sm text-blue-700">Всего документов</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{stats.expiring}</div>
          <div className="text-sm text-orange-700">Истекают (≤30 дн.)</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">{stats.expired}</div>
          <div className="text-sm text-red-700">Просрочены</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">📄 Документы списком</TabsTrigger>
          <TabsTrigger value="add">➕ Добавить документ</TabsTrigger>
        </TabsList>

        {/* Documents List */}
        <TabsContent value="list" className="space-y-4">
          {Object.entries(groupedDocuments).map(([type, docs]) => {
            const typeLabel = DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
            return (
              <div key={type} className="bg-white rounded-lg shadow">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">{typeLabel}</h3>
                </div>
                <div className="divide-y">
                  {docs.map((doc) => {
                    const status = getDocumentStatus(doc.date_expiry);
                    return (
                      <div key={doc.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Выдан:</span>{' '}
                                {doc.date_issued
                                  ? new Date(doc.date_issued).toLocaleDateString('ru-RU')
                                  : '—'}
                              </div>
                              <div>
                                <span className="text-gray-500">Истекает:</span>{' '}
                                {doc.date_expiry
                                  ? new Date(doc.date_expiry).toLocaleDateString('ru-RU')
                                  : '—'}
                              </div>
                              <div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                            {doc.file_url ? (
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {doc.file_url.split(';').map((url, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewerFile({ url, name: `${doc.title} - Файл ${index + 1}` })}
                                    className="text-blue-600 hover:bg-blue-50"
                                  >
                                    👁️ Файл {index + 1}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-gray-500 italic">
                                📎 Файлы не прикреплены
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Документы отсутствуют. Добавьте первый документ во вкладке "Добавить документ".
            </div>
          )}
        </TabsContent>

        {/* Add Document Form */}
        <TabsContent value="add">
          <form onSubmit={handleAddDocument} className="bg-white rounded-lg shadow p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="document_type">Тип документа *</Label>
                <Select name="document_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Название документа *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Например: Haftpflichtversicherung 2024"
                />
              </div>

              <div>
                <Label htmlFor="date_issued">Дата выдачи</Label>
                <Input id="date_issued" name="date_issued" type="date" />
              </div>

              <div>
                <Label htmlFor="date_expiry">Дата истечения</Label>
                <Input id="date_expiry" name="date_expiry" type="date" />
              </div>
            </div>

            <div>
              <Label htmlFor="files">Файлы документа</Label>
              <Input
                id="files"
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500 mt-1">
                Можно выбрать несколько файлов (JPG, PNG, PDF)
              </p>
              {documentFiles.length > 0 && (
                <p className="text-sm text-blue-600 mt-1">
                  Выбрано файлов: {documentFiles.length}
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? 'Сохранение...' : '✅ Добавить документ'}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Document Viewer Modal */}
      {viewerFile && (
        <DocumentViewer
          fileUrl={viewerFile.url}
          fileName={viewerFile.name}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  );
}

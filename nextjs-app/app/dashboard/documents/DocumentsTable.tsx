'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';

interface Document {
  id: string;
  document_type: string;
  title: string;
  date_issued: string | null;
  date_expiry: string | null;
  file_url: string | null;
  vehicle_id: string;
  vehicles: {
    id: string;
    name: string;
    license_plate: string | null;
    photo_url: string | null;
  };
}

interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
}

interface DocumentsTableProps {
  documents: Document[];
  vehicles: Vehicle[];
  totalCount: number;
}

const DOCUMENT_TYPES = [
  { value: 'insurance', label: '🛡️ Страховка' },
  { value: 'inspection', label: '🔧 Техосмотр' },
  { value: 'registration', label: '📋 Регистрация' },
  { value: 'license', label: '📜 Лицензия' },
  { value: 'permit', label: '✅ Разрешение' },
  { value: 'rental_contract', label: '🏢 Договор аренды' },
];

export function DocumentsTable({ documents, vehicles, totalCount }: DocumentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [vehicleFilter, setVehicleFilter] = useState(searchParams.get('vehicle') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

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

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleVehicleFilter = (value: string) => {
    setVehicleFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('vehicle');
    } else {
      params.set('vehicle', value);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handleExport = () => {
    const headers = ['Автомобиль', 'Тип документа', 'Название', 'Дата выдачи', 'Дата истечения', 'Статус'];
    const rows = documents.map((doc) => {
      const status = getDocumentStatus(doc.date_expiry);
      const docType = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;
      return [
        `${doc.vehicles.name} (${doc.vehicles.license_plate || ''})`,
        docType,
        doc.title,
        doc.date_issued ? new Date(doc.date_issued).toLocaleDateString('ru-RU') : '',
        doc.date_expiry ? new Date(doc.date_expiry).toLocaleDateString('ru-RU') : '',
        status.label,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `documents_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate statistics
  const stats = {
    total: totalCount,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📄 Все документы</h1>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="🔍 Поиск по названию..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <Select value={vehicleFilter} onValueChange={handleVehicleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Автомобиль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все автомобили</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} {vehicle.license_plate && `(${vehicle.license_plate})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Тип документа" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="valid">✓ Действительные</SelectItem>
              <SelectItem value="expiring">⚠️ Истекающие</SelectItem>
              <SelectItem value="expired">❌ Просроченные</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
            🔍 Поиск
          </Button>
          <Button variant="outline" onClick={handleExport}>
            📥 Экспорт CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearchInput('');
              setVehicleFilter('all');
              setTypeFilter('all');
              setStatusFilter('all');
              router.push('/dashboard/documents');
            }}
          >
            🔄 Сбросить
          </Button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Автомобиль
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип документа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата выдачи
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата истечения
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Файлы
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => {
              const status = getDocumentStatus(doc.date_expiry);
              const docType = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;

              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {doc.vehicles.photo_url && (
                        <div className="relative w-10 h-10 mr-3">
                          <Image
                            src={doc.vehicles.photo_url.split(';')[0]}
                            alt={doc.vehicles.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{doc.vehicles.name}</div>
                        {doc.vehicles.license_plate && (
                          <div className="text-sm text-gray-500">{doc.vehicles.license_plate}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {docType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {doc.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.date_issued
                      ? new Date(doc.date_issued).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.date_expiry
                      ? new Date(doc.date_expiry).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {doc.file_url ? (
                      <div className="flex gap-1">
                        {doc.file_url.split(';').map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            📎 {index + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/vehicles/${doc.vehicle_id}`)}
                    >
                      👁️ Открыть
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {documents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Документы не найдены
          </div>
        )}
      </div>
    </div>
  );
}

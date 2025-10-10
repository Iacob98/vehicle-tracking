'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { DeleteItemButton } from '@/components/DeleteItemButton';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
  vin: string | null;
  status: 'active' | 'repair' | 'unavailable' | 'rented';
  model: string | null;
  year: number | null;
  photo_url: string | null;
  is_rental: boolean | null;
  rental_start_date: string | null;
  rental_end_date: string | null;
  rental_monthly_price: number | null;
  created_at: string;
}

interface VehiclesTableProps {
  vehicles: Vehicle[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

export function VehiclesTable({
  vehicles,
  totalCount,
  currentPage,
  totalPages,
  itemsPerPage,
}: VehiclesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('page', '1');
    router.push(`/dashboard/vehicles?${params.toString()}`);
  };

  const handleExport = async () => {
    // Convert vehicles to CSV
    const headers = ['Название', 'Гос.номер', 'VIN', 'Модель', 'Год', 'Статус', 'Аренда', 'Цена аренды'];
    const rows = vehicles.map((v) => [
      v.name,
      v.license_plate || '',
      v.vin || '',
      v.model || '',
      v.year || '',
      v.status,
      v.is_rental ? 'Да' : 'Нет',
      v.rental_monthly_price || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      repair: 'bg-yellow-100 text-yellow-800',
      unavailable: 'bg-gray-100 text-gray-800',
      rented: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      active: '🟢 Активен',
      repair: '🔧 Ремонт',
      unavailable: '🔴 Недоступен',
      rented: '🏢 Аренда',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚗 Автомобили</h1>
          <p className="text-gray-600">Управление автопарком</p>
        </div>
        <Link href="/dashboard/vehicles/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            + Добавить автомобиль
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Поиск по названию, гос.номеру, VIN..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активен</SelectItem>
              <SelectItem value="repair">Ремонт</SelectItem>
              <SelectItem value="unavailable">Недоступен</SelectItem>
              <SelectItem value="rented">Аренда</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSearch} variant="default">
            🔍 Поиск
          </Button>
          <Button onClick={handleExport} variant="outline">
            📥 Экспорт CSV
          </Button>
        </div>
      </div>

      {/* Vehicles List */}
      {vehicles.length > 0 ? (
        <div className="space-y-4">
          {vehicles.map((vehicle) => {
            const photoUrl = vehicle.photo_url?.split(';')[0]; // Get first photo if multiple

            return (
              <div
                key={vehicle.id}
                className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition ${
                  vehicle.is_rental ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Photo */}
                  <div className="col-span-1">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={vehicle.name}
                        width={80}
                        height={80}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-3xl">
                        🚗
                      </div>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="col-span-5">
                    <h3 className="font-bold text-lg">{vehicle.name}</h3>
                    <p className="text-sm text-gray-600">
                      📋 {vehicle.license_plate || 'Нет номера'} | VIN: {vehicle.vin || '-'}
                    </p>
                    {vehicle.model && (
                      <p className="text-sm text-gray-500">🚗 {vehicle.model}</p>
                    )}
                    {vehicle.year && (
                      <p className="text-sm text-gray-500">📅 {vehicle.year}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    {getStatusBadge(vehicle.status)}
                    {vehicle.is_rental && vehicle.rental_monthly_price && (
                      <p className="text-sm text-blue-600 font-semibold mt-2">
                        💰 {vehicle.rental_monthly_price}€/мес
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-4 flex gap-2 justify-end">
                    <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                      <Button variant="outline" size="sm">
                        📄 Документы
                      </Button>
                    </Link>
                    <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
                      <Button variant="outline" size="sm">
                        ✏️ Редактировать
                      </Button>
                    </Link>
                    <DeleteItemButton
                      id={vehicle.id}
                      baseUrl="/api/vehicles"
                      itemName={`автомобиль "${vehicle.name}" (${vehicle.license_plate || 'без номера'})`}
                      size="sm"
                      variant="outline"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/vehicles"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalCount}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет автомобилей</h3>
          <p className="text-gray-600 mb-6">
            {searchInput || statusFilter !== 'all'
              ? 'Попробуйте изменить фильтры'
              : 'Начните с добавления первого автомобиля в ваш автопарк'}
          </p>
          {!searchInput && statusFilter === 'all' && (
            <Link href="/dashboard/vehicles/new">
              <Button className="bg-blue-600 hover:bg-blue-700">+ Добавить автомобиль</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

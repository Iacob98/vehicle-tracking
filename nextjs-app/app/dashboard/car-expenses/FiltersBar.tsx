'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
}

interface Category {
  value: string;
  label: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface FiltersBarProps {
  vehicles: Vehicle[];
  categories: Category[];
  sortOptions: SortOption[];
}

export function FiltersBar({ vehicles, categories, sortOptions }: FiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentVehicle = searchParams.get('vehicle') || '';
  const currentSort = searchParams.get('sort') || 'date';
  const currentOrder = searchParams.get('order') || 'desc';

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    params.delete('page');

    router.push(`/dashboard/car-expenses?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/dashboard/car-expenses');
  };

  const hasActiveFilters = currentCategory || currentVehicle || currentSort !== 'date' || currentOrder !== 'desc';

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">🔍 Фильтры и сортировка</h2>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="text-red-600 hover:bg-red-50"
          >
            ✕ Сбросить всё
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📂 Категория
          </label>
          <select
            value={currentCategory}
            onChange={(e) => updateFilters({ category: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все категории</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">
            🚗 Автомобиль
          </label>
          <select
            value={currentVehicle}
            onChange={(e) => updateFilters({ vehicle: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все автомобили</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.license_plate})
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium mb-2">
            ⬇️ Сортировать по
          </label>
          <select
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium mb-2">
            🔄 Порядок
          </label>
          <select
            value={currentOrder}
            onChange={(e) => updateFilters({ order: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">↓ По убыванию</option>
            <option value="asc">↑ По возрастанию</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-sm text-gray-600">Активные фильтры:</span>
          {currentCategory && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {categories.find(c => c.value === currentCategory)?.label}
              <button
                onClick={() => updateFilters({ category: '' })}
                className="hover:text-blue-900"
              >
                ✕
              </button>
            </span>
          )}
          {currentVehicle && (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
              {vehicles.find(v => v.id === currentVehicle)?.name}
              <button
                onClick={() => updateFilters({ vehicle: '' })}
                className="hover:text-green-900"
              >
                ✕
              </button>
            </span>
          )}
          {currentSort !== 'date' && (
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
              {sortOptions.find(s => s.value === currentSort)?.label}
              <button
                onClick={() => updateFilters({ sort: 'date' })}
                className="hover:text-purple-900"
              >
                ✕
              </button>
            </span>
          )}
          {currentOrder !== 'desc' && (
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
              ↑ По возрастанию
              <button
                onClick={() => updateFilters({ order: 'desc' })}
                className="hover:text-orange-900"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

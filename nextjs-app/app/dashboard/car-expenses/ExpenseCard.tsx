'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { RoleGuard } from '@/components/RoleGuard';
import { type UserRole } from '@/lib/types/roles';

const CATEGORY_ICONS = {
  fuel: '⛽',
  repair: '🔧',
  maintenance: '🛠️',
  insurance: '🛡️',
  other: '📝',
};

const CATEGORY_NAMES = {
  fuel: 'Топливо / Kraftstoff',
  repair: 'Ремонт / Reparatur',
  maintenance: 'Обслуживание / Wartung',
  insurance: 'Страховка / Versicherung',
  other: 'Другое / Sonstiges',
};

interface ExpenseCardProps {
  expense: {
    id: string;
    vehicle_name?: string;
    license_plate?: string;
    date: string | null;
    description?: string | null;
    category: string;
    amount: string | number;
    receipt_url?: string | null;
    maintenance_id?: string | null;
  };
  userRole: UserRole;
}

export function ExpenseCard({ expense, userRole }: ExpenseCardProps) {
  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-4 gap-4">
          <div>
            <h3 className="font-semibold">
              {expense.vehicle_name} ({expense.license_plate})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              📅 {expense.date ? new Date(expense.date).toLocaleDateString('ru-RU') : '—'}
            </p>
            {expense.description && (
              <p className="text-sm text-gray-600 mt-1">📝 {expense.description}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-600">
              {CATEGORY_ICONS[expense.category as keyof typeof CATEGORY_ICONS]}{' '}
              {CATEGORY_NAMES[expense.category as keyof typeof CATEGORY_NAMES]}
            </p>
            <p className="text-2xl font-bold mt-1">€{parseFloat(expense.amount.toString() || '0').toFixed(2)}</p>
          </div>

          <div>
            {expense.receipt_url ? (
              <div className="space-y-2">
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  📎 Посмотреть чек / Beleg ansehen
                </a>
                {expense.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <img
                    src={expense.receipt_url}
                    alt="Receipt"
                    className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                    onClick={() => window.open(expense.receipt_url!, '_blank')}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">📎 Нет файла / Keine Datei</p>
            )}
            {expense.maintenance_id && (
              <p className="text-sm text-blue-600 mt-1">🔧 От ТО / Von Wartung</p>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {!expense.maintenance_id && (
              <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
                <>
                  <Link href={`/dashboard/car-expenses/${expense.id}/edit`}>
                    <Button variant="outline" size="sm">✏️</Button>
                  </Link>
                  <DeleteItemButton
                    id={expense.id}
                    baseUrl="/api/car-expenses"
                    itemName={`расход "${expense.description || CATEGORY_NAMES[expense.category as keyof typeof CATEGORY_NAMES]}" на ${expense.vehicle_name} (€${parseFloat(expense.amount.toString() || '0').toFixed(2)})`}
                    size="sm"
                    variant="outline"
                  />
                </>
              </RoleGuard>
            )}
            {expense.maintenance_id && (
              <span className="text-sm text-gray-400">🔒 Связан с ТО</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

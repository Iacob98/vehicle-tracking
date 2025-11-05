'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, User, Car, Fuel, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePutJSON } from '@/lib/api-client';

interface FuelAnomaly {
  id: string;
  date: string;
  amount: number;
  liters: number;
  odometer_reading: number;
  previous_odometer_reading: number | null;
  distance_traveled: number | null;
  expected_consumption: number;
  actual_consumption: number;
  consumption_difference: number;
  vehicle_id: string;
  vehicle_name: string;
  license_plate: string;
  driver_name: string | null;
  anomaly_checked_by: string | null;
  anomaly_checked_at: string | null;
}

interface FuelAnomaliesAlertProps {
  anomalies: FuelAnomaly[];
  userRole: 'owner' | 'admin' | 'manager' | 'viewer' | 'driver';
}

export function FuelAnomaliesAlert({ anomalies, userRole }: FuelAnomaliesAlertProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { loading, error, put } = usePutJSON('', {
    onSuccess: () => {
      setMarkingId(null);
      router.refresh();
    },
  });

  const uncheckedAnomalies = anomalies.filter(a => !a.anomaly_checked_by);
  const checkedAnomalies = anomalies.filter(a => a.anomaly_checked_by);

  if (anomalies.length === 0) {
    return null;
  }

  const canMarkAsChecked = ['owner', 'admin'].includes(userRole);

  const handleMarkAsChecked = async (anomalyId: string) => {
    if (!canMarkAsChecked) return;

    setMarkingId(anomalyId);
    await put(`/api/car-expenses/${anomalyId}/check-anomaly`, {});
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getAnomalyPercentage = (expected: number, actual: number) => {
    if (expected === 0) return 0;
    return ((actual - expected) / expected * 100).toFixed(1);
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-6 shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500 rounded-full p-3">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900">
              ⚠️ Аномалии расхода топлива
            </h3>
            <p className="text-sm text-red-700">
              Обнаружено {uncheckedAnomalies.length} непроверенных аномалий
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-red-700 hover:text-red-900"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Показать детали
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Unchecked Anomalies */}
          {uncheckedAnomalies.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-900 mb-3">
                🔴 Непроверенные ({uncheckedAnomalies.length})
              </h4>
              <div className="space-y-3">
                {uncheckedAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="bg-white border border-red-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{formatDate(anomaly.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Car className="h-4 w-4 text-blue-500" />
                          <span>
                            {anomaly.vehicle_name} ({anomaly.license_plate})
                          </span>
                        </div>
                        {anomaly.driver_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>Водитель: {anomaly.driver_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Fuel className="h-4 w-4 text-orange-500" />
                          <span>Залито: {anomaly.liters.toFixed(2)} л</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Ожидалось:</span>{' '}
                          <span className="font-medium text-green-600">
                            {anomaly.expected_consumption.toFixed(2)} л
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Перерасход:</span>{' '}
                          <span className="font-bold text-red-600">
                            +{anomaly.consumption_difference.toFixed(2)} л
                            ({getAnomalyPercentage(anomaly.expected_consumption, anomaly.actual_consumption)}%)
                          </span>
                        </div>
                        {anomaly.distance_traveled && (
                          <div className="text-sm text-gray-600">
                            Пробег: {anomaly.distance_traveled} км
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {canMarkAsChecked && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsChecked(anomaly.id)}
                          disabled={loading && markingId === anomaly.id}
                          className="text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {loading && markingId === anomaly.id
                            ? 'Проверяется...'
                            : 'Отметить как проверенное'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checked Anomalies */}
          {checkedAnomalies.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                ✅ Проверенные ({checkedAnomalies.length})
              </h4>
              <div className="space-y-2">
                {checkedAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 opacity-60"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{formatDate(anomaly.date)}</span>
                        <span className="text-gray-600">
                          {anomaly.vehicle_name} ({anomaly.license_plate})
                        </span>
                      </div>
                      <span className="text-gray-500">
                        Проверено: {anomaly.anomaly_checked_at ? formatDate(anomaly.anomaly_checked_at) : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-300 rounded p-3 text-sm text-red-800">
              Ошибка: {error}
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              ℹ️ Как работает система обнаружения аномалий:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Система рассчитывает ожидаемый расход на основе типа автомобиля и пройденной
                дистанции
              </li>
              <li>
                • Если фактический расход превышает ожидаемый более чем на 15%, создаётся
                аномалия
              </li>
              <li>
                • Администраторы могут отметить аномалию как проверенную после выяснения причины
              </li>
              <li>• Возможные причины: утечка топлива, неточные показания, неэффективное вождение</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

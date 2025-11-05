'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface DriverAnomalyBannerProps {
  anomalyCount: number;
}

export function DriverAnomalyBanner({ anomalyCount }: DriverAnomalyBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (anomalyCount === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="bg-white rounded-full p-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">
            ⚠️ Внимание: Обнаружены аномалии расхода топлива
          </h3>
          <p className="text-white/90 mb-4">
            {anomalyCount === 1
              ? 'Обнаружена 1 аномалия в расходе топлива на вашем автомобиле.'
              : `Обнаружено ${anomalyCount} аномалий в расходе топлива на вашем автомобиле.`}
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">Что это значит?</h4>
            <ul className="space-y-1 text-sm text-white/90">
              <li>
                • Система обнаружила, что фактический расход топлива превышает ожидаемый более чем
                на 15%
              </li>
              <li>• Это может указывать на утечку топлива, неэффективное вождение или другие проблемы</li>
              <li>
                • Пожалуйста, свяжитесь с администратором для получения дополнительной информации
              </li>
            </ul>
          </div>
          <div className="flex gap-3">
            <a href="/dashboard/car-expenses">
              <Button
                variant="secondary"
                className="bg-white text-red-600 hover:bg-gray-100"
              >
                Посмотреть детали
              </Button>
            </a>
            <Button
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-white hover:bg-white/20"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

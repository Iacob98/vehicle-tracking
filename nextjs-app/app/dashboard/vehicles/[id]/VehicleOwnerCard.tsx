'use client';

interface VehicleOwnerCardProps {
  vehicleName: string;
  currentTeam: {
    name: string;
    start_date: string;
  } | null;
}

export function VehicleOwnerCard({ vehicleName, currentTeam }: VehicleOwnerCardProps) {
  if (!currentTeam) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="text-4xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-yellow-900">
              Автомобиль не назначен
            </h2>
            <p className="text-yellow-700 mt-1">
              {vehicleName} в данный момент не закреплён за бригадой
            </p>
          </div>
        </div>
      </div>
    );
  }

  const daysSinceAssignment = Math.floor(
    (Date.now() - new Date(currentTeam.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🚗</div>
          <div>
            <div className="text-sm text-blue-600 font-medium mb-1">
              ТЕКУЩИЙ ВЛАДЕЛЕЦ
            </div>
            <h2 className="text-2xl font-bold text-blue-900">
              {currentTeam.name}
            </h2>
            <div className="mt-2 flex items-center gap-4 text-sm text-blue-700">
              <div>
                <span className="font-medium">С:</span>{' '}
                {new Date(currentTeam.start_date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <div className="bg-blue-200 px-3 py-1 rounded-full font-medium">
                {daysSinceAssignment} {getDaysWord(daysSinceAssignment)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm">
          ✓ АКТИВНО
        </div>
      </div>
    </div>
  );
}

function getDaysWord(days: number): string {
  if (days % 10 === 1 && days % 100 !== 11) {
    return 'день';
  } else if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
    return 'дня';
  } else {
    return 'дней';
  }
}

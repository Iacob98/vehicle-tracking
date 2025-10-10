'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestConnection() {
  const [status, setStatus] = useState<string>('Проверка подключения...');
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    async function testConnection() {
      try {
        // Проверяем подключение
        const { data, error } = await supabase
          .from('organizations')
          .select('count')
          .limit(1);

        if (error) {
          if (error.message.includes('relation "organizations" does not exist')) {
            setStatus('✅ Подключение успешно! Но схема БД не загружена.');
          } else {
            setStatus(`❌ Ошибка: ${error.message}`);
          }
        } else {
          setStatus('✅ Подключение успешно! Схема БД загружена.');
        }
      } catch (err: any) {
        setStatus(`❌ Ошибка подключения: ${err.message}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Тест подключения Supabase
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-lg font-semibold text-blue-900">{status}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-semibold text-gray-900 mb-2">Конфигурация:</h2>
            <p className="text-sm text-gray-600">
              URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'не задан'}
            </p>
            <p className="text-sm text-gray-600">
              Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ установлен' : '✗ не задан'}
            </p>
          </div>

          {tables.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="font-semibold text-green-900 mb-2">Таблицы в БД:</h2>
              <ul className="list-disc list-inside text-sm text-green-800">
                {tables.map((table, i) => (
                  <li key={i}>{table.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4">
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Вернуться на главную
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

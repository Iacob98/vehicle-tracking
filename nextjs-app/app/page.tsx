export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚗 Fleet Management System
          </h1>
          <p className="text-xl text-gray-600">
            Next.js + Supabase Migration
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Next.js структура создана</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span>Supabase ключи настроены</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              <span>Ожидание загрузки схемы БД</span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h2 className="font-semibold text-blue-900 mb-2">
              📋 Следующий шаг:
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
              <li>Откройте Supabase Dashboard</li>
              <li>Перейдите в SQL Editor</li>
              <li>Скопируйте содержимое файла <code className="bg-blue-100 px-1 rounded">lib/database-schema.sql</code></li>
              <li>Выполните SQL скрипт</li>
              <li>Вернитесь сюда и проверьте подключение</li>
            </ol>
          </div>

          <div className="flex gap-4 mt-6">
            <a 
              href="/test-connection"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition text-center font-medium"
            >
              Проверить подключение
            </a>
            <a 
              href="https://wymucemxzhaulibsqdta.supabase.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition text-center font-medium"
            >
              Открыть Supabase →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

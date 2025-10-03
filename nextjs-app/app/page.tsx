export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚗 Fleet Management System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Next.js + Supabase Migration
        </p>
        <div className="space-y-2 text-gray-500">
          <p>✅ Next.js структура создана</p>
          <p>⏳ Ожидание конфигурации Supabase</p>
        </div>
      </div>
    </div>
  );
}

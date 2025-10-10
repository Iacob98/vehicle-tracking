import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function BugReportPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  // Get user info
  const { data: userData } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single();

  async function submitBugReport(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const category = formData.get('category') as string;

    if (!title || !description) {
      return;
    }

    // In real app, this would go to a bug tracking system
    // For now, we'll just log it or save to a bugs table
    console.log('Bug Report:', {
      user_id: user?.id,
      organization_id: orgId,
      title,
      description,
      priority,
      category,
      created_at: new Date().toISOString()
    });

    // You could also save to Supabase if you have a bug_reports table
    // await supabase.from('bug_reports').insert({...})

    revalidatePath('/dashboard/bug-report');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🐛 Сообщить о проблеме / Problem melden</h1>
        <p className="text-gray-600">Отправить отчет об ошибке или предложение</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Инструкция / Anleitung</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Опишите проблему максимально подробно</li>
          <li>• Укажите шаги для воспроизведения ошибки</li>
          <li>• Приложите скриншоты если возможно</li>
          <li>• Beschreiben Sie das Problem so detailliert wie möglich</li>
        </ul>
      </div>

      {/* User info */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-2">👤 Информация о пользователе</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Имя: {userData?.first_name} {userData?.last_name}</p>
          <p>Email: {userData?.email}</p>
          <p>ID организации: {orgId}</p>
        </div>
      </div>

      {/* Bug report form */}
      <form action={submitBugReport} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              📌 Категория / Kategorie *
            </label>
            <select
              name="category"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="bug">🐛 Ошибка / Fehler</option>
              <option value="feature">✨ Предложение / Vorschlag</option>
              <option value="performance">⚡ Производительность / Leistung</option>
              <option value="ui">🎨 Интерфейс / Oberfläche</option>
              <option value="data">📊 Данные / Daten</option>
              <option value="other">📝 Другое / Sonstiges</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              🎯 Приоритет / Priorität *
            </label>
            <select
              name="priority"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">🟢 Низкий / Niedrig</option>
              <option value="medium">🟡 Средний / Mittel</option>
              <option value="high">🟠 Высокий / Hoch</option>
              <option value="critical">🔴 Критический / Kritisch</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              📝 Заголовок / Titel *
            </label>
            <Input
              type="text"
              name="title"
              required
              placeholder="Краткое описание проблемы"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              📄 Подробное описание / Detaillierte Beschreibung *
            </label>
            <textarea
              name="description"
              required
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder={`Опишите проблему:
1. Что вы делали?
2. Что ожидали увидеть?
3. Что произошло на самом деле?
4. Как воспроизвести проблему?`}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            📤 Отправить отчет / Bericht senden
          </Button>
        </div>
      </form>

      {/* Recent reports info */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">ℹ️ Информация</h3>
        <p className="text-sm text-gray-600">
          Ваш отчет будет рассмотрен в ближайшее время. Спасибо за помощь в улучшении системы!
          <br />
          Ihr Bericht wird in Kürze geprüft. Vielen Dank für Ihre Hilfe bei der Verbesserung des Systems!
        </p>
      </div>
    </div>
  );
}

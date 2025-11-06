import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Если пользователь авторизован, перенаправляем на дашборд
  if (user) {
    redirect('/dashboard');
  }

  // Если не авторизован, перенаправляем на страницу логина
  redirect('/login');
}

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('🍪 Setting cookie:', name, 'value length:', value?.length);
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Handle cookies in Server Components
            console.error('⚠️ Error setting cookies:', error);
          }
        },
      },
    }
  );
}

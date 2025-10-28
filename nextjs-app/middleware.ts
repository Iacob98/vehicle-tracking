import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('🔐 Middleware - Path:', request.nextUrl.pathname);
  console.log('👤 Middleware - User:', user?.id || 'NOT LOGGED IN');
  console.log('❌ Middleware - Error:', error?.message || 'none');

  if (error) {
    console.error('🚨 Auth error in middleware:', error);
  }

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('⚠️ No user, redirecting to /login');
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === '/login') {
    console.log('✅ User logged in, redirecting based on role');
    const url = request.nextUrl.clone();

    // Redirect based on role
    const userRole = user.user_metadata?.role;
    if (userRole === 'driver') {
      url.pathname = '/dashboard/driver';
      console.log('🚗 Driver detected, redirecting to /dashboard/driver');
    } else {
      url.pathname = '/dashboard';
      console.log('👔 Admin/Manager detected, redirecting to /dashboard');
    }

    return NextResponse.redirect(url);
  }

  // If driver tries to access admin dashboard pages, redirect to driver panel
  if (user && user.user_metadata?.role === 'driver') {
    // Allow driver to access their own panel
    if (request.nextUrl.pathname.startsWith('/dashboard/driver')) {
      console.log('✅ Driver accessing driver panel');
      return supabaseResponse; // Important: return here to stop processing
    } else if (request.nextUrl.pathname.startsWith('/dashboard')) {
      // Block access to any admin dashboard page
      console.log('🚫 Driver blocked from admin page, redirecting to /dashboard/driver');
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard/driver';
      return NextResponse.redirect(url);
    }
  }

  // If non-driver tries to access driver panel, redirect to admin dashboard
  if (user && request.nextUrl.pathname.startsWith('/dashboard/driver') && user.user_metadata?.role !== 'driver') {
    console.log('👔 Non-driver accessing /dashboard/driver, redirecting to /dashboard');
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  console.log('✅ Middleware passed, continuing to:', request.nextUrl.pathname);

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseCredentials } from '@/lib/supabase/client';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, key } = getSupabaseCredentials();
  let isAuthenticated = false;

  const localAuthCookie = request.cookies.get('studio_h_session')?.value;
  if (localAuthCookie === 'authenticated') {
    isAuthenticated = true;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
    }
  } catch {
    // Fallback to cookie check
  }

  if (!isAuthenticated && pathname !== '/login') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Fast 0ms synchronous cookie check (no blocking remote HTTP call on page reload)
  const localAuthCookie = request.cookies.get('studio_h_session')?.value;
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  const isAuthenticated =
    localAuthCookie === 'authenticated' || hasSupabaseCookie;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

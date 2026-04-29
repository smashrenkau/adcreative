import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ad_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET ?? 'changeme';
  const session = request.cookies.get(SESSION_COOKIE);

  if (!session || session.value !== secret) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

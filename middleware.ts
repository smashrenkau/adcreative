import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ad_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ログインページと認証APIは誰でもアクセス可
  if (pathname === '/adcreative/login' || pathname.startsWith('/adcreative/api/auth')) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET ?? 'changeme';
  const session = request.cookies.get(SESSION_COOKIE);

  if (!session || session.value !== secret) {
    const loginUrl = new URL('/adcreative/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/adcreative/:path*'],
};

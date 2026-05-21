import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ad_session';
const ADMIN_COOKIE = 'admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') ?? '';

  // 管理ページ
  if (pathname.startsWith('/smash-admin')) {
    if (pathname === '/smash-admin/login') return NextResponse.next();
    const adminSecret = process.env.ADMIN_SESSION_SECRET ?? 'admin-changeme';
    const adminSession = request.cookies.get(ADMIN_COOKIE);
    if (!adminSession || adminSession.value !== adminSecret) {
      return NextResponse.redirect(new URL('/smash-admin/login', request.url));
    }
    return NextResponse.next();
  }

  // 管理API
  if (pathname.startsWith('/api/smash-admin/')) {
    if (pathname.startsWith('/api/smash-admin/auth')) return NextResponse.next();
    const adminSecret = process.env.ADMIN_SESSION_SECRET ?? 'admin-changeme';
    const adminSession = request.cookies.get(ADMIN_COOKIE);
    if (!adminSession || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // クライアントページ・APIは認証不要
  if (pathname.startsWith('/client/') || pathname.startsWith('/api/client/')) {
    return NextResponse.next();
  }

  // サブドメインによるルーティング（本番環境のみ）
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  if (!isLocalhost) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'adcreative') {
      // API ルートはそのまま通す（書き換えると /client/[slug] の HTML に化けてしまう）
      if (pathname.startsWith('/api/')) return NextResponse.next();

      const url = request.nextUrl.clone();
      url.pathname =
        pathname === '/' ? `/client/${subdomain}` : `/client/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 既存のRenkau認証
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

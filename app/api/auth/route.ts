import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ad_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30日
};

// POST: ログイン
export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const appPassword = process.env.APP_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET ?? 'changeme';

  if (!appPassword || password !== appPassword) {
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionSecret, COOKIE_OPTIONS);
  return res;
}

// DELETE: ログアウト
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}

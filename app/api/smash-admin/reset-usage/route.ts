import { NextRequest, NextResponse } from 'next/server';
import { resetUsage, getYearMonth } from '@/lib/tenants';

export async function POST(request: NextRequest) {
  try {
    const { slug, yearMonth } = await request.json();
    await resetUsage(slug, yearMonth ?? getYearMonth());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readHistory, deleteHistoryItem } from '@/lib/blob-history';
import { getTenantBySlug } from '@/lib/tenants';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ items: [] });

  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ items: [] });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ items: [] });

    const items = await readHistory(slug);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const id = request.nextUrl.searchParams.get('id');
  if (!slug || !id) {
    return NextResponse.json({ error: 'slug と id が必要です' }, { status: 400 });
  }

  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });

    const ok = await deleteHistoryItem(slug, id);
    if (!ok) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

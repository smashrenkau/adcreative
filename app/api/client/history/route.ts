import { NextRequest, NextResponse } from 'next/server';
import { readHistory } from '@/lib/blob-history';
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

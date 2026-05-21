import { NextResponse } from 'next/server';
import { readHistory } from '@/lib/blob-history';

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ items: [] });
  }
  try {
    const items = await readHistory();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

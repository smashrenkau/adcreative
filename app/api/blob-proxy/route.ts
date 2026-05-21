import { NextRequest, NextResponse } from 'next/server';
import { head, get } from '@vercel/blob';

export async function GET(request: NextRequest) {
  const blobPath = request.nextUrl.searchParams.get('path');
  if (!blobPath) return NextResponse.json({ error: 'path required' }, { status: 400 });

  try {
    const blob = await head(blobPath);
    const result = await get(blob.url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

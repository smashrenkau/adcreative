import { NextRequest, NextResponse } from 'next/server';
import { head, get } from '@vercel/blob';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
};

export async function GET(request: NextRequest) {
  const blobPath = request.nextUrl.searchParams.get('path');
  if (!blobPath) return NextResponse.json({ error: 'path required' }, { status: 400 });

  try {
    const blob = await head(blobPath);
    const result = await get(blob.url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ext = blobPath.split('.').pop()?.toLowerCase() || '';
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

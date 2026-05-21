import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const slug = form.get('slug');

    if (!(file instanceof File) || typeof slug !== 'string' || !slug) {
      return NextResponse.json({ error: 'file と slug は必須です' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `logos/${slug}/${randomUUID()}.${ext}`;

    const blob = await put(path, file, {
      access: 'private',
      addRandomSuffix: false,
    });

    const proxyUrl = `/api/blob-proxy?path=${encodeURIComponent(path)}`;
    return NextResponse.json({ url: proxyUrl, blobUrl: blob.url, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

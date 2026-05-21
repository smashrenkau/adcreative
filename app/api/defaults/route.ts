import { NextResponse } from 'next/server';
import { put, head, get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BLOB_KEY = 'prompts/defaults.md';
const LOCAL_PATH = path.join(process.cwd(), 'prompts', 'defaults.md');

async function readDefaults(): Promise<string> {
  try {
    const blob = await head(BLOB_KEY);
    const result = await get(blob.url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) throw new Error('no stream');
    return await new Response(result.stream).text();
  } catch {
    // Blob未保存時はローカルファイルにフォールバック
    try {
      return fs.readFileSync(LOCAL_PATH, 'utf-8');
    } catch {
      return '';
    }
  }
}

export async function GET() {
  const content = await readDefaults();
  return NextResponse.json({ content }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    await put(BLOB_KEY, content, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[defaults POST error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

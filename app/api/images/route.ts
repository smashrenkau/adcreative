import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get('file');
  if (!filename) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), 'pictransparent', safeName);

  try {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(safeName).toLowerCase();
    return new NextResponse(buf, {
      headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream' },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

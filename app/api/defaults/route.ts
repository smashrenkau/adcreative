import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULTS_PATH = path.join(process.cwd(), 'prompts', 'defaults.md');

export async function GET() {
  try {
    const content = fs.readFileSync(DEFAULTS_PATH, 'utf-8');
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: '' });
  }
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    fs.writeFileSync(DEFAULTS_PATH, content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

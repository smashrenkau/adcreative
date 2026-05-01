import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageB64, mimeType = 'image/png', filename } = body;

    const buf = Buffer.from(imageB64, 'base64');
    const imageFile = new File([buf], 'image.png', { type: mimeType });

    const res = await getOpenAI().images.edit({
      model: 'gpt-image-2',
      image: imageFile,
      prompt:
        'Remove the background from this product image completely, making it fully transparent. Keep only the main subject/product with clean, precise edges. Do not add any new background color or pattern.',
      size: '1024x1024',
    });

    return NextResponse.json({ imageB64: res.data?.[0]?.b64_json });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[remove-bg]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 透過済み画像をpictransparentフォルダに保存
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageB64, filename } = body;

    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

    const safeName = path.basename(filename).replace(/\.[^.]+$/, '') + '.png';
    const savePath = path.join(process.cwd(), 'pictransparent', safeName);

    const buf = Buffer.from(imageB64, 'base64');
    fs.writeFileSync(savePath, buf);

    return NextResponse.json({ ok: true, savedAs: safeName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

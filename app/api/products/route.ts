import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dir = path.join(process.cwd(), 'pictransparent');

  try {
    const files = fs.readdirSync(dir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    const products = imageFiles.map(f => ({
      name: path.basename(f, path.extname(f)),
      filename: f,
    }));
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] });
  }
}

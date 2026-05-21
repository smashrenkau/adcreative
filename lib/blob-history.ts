import { put, list, get } from '@vercel/blob';
import { randomUUID } from 'crypto';

export interface HistoryItem {
  id: string;
  productName: string;
  monthlyPrice: string;
  atmosphere: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
}

const INDEX_PATH = 'history/index.json';

export async function readHistory(): Promise<HistoryItem[]> {
  try {
    const { blobs } = await list({ prefix: INDEX_PATH, limit: 1 });
    if (!blobs[0]) return [];
    const result = await get(blobs[0].url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function appendHistory(
  imageB64: string,
  meta: Pick<HistoryItem, 'productName' | 'monthlyPrice' | 'atmosphere' | 'aspectRatio'>
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const id = randomUUID();
  const buf = Buffer.from(imageB64, 'base64');
  const blobPath = `history/images/${id}.png`;

  await put(
    blobPath,
    new Blob([buf], { type: 'image/png' }),
    { access: 'private', addRandomSuffix: false }
  );

  // プロキシURL経由でブラウザに表示する
  const imageUrl = `/api/blob-proxy?path=${encodeURIComponent(blobPath)}`;

  const current = await readHistory();
  const updated: HistoryItem[] = [
    { id, ...meta, imageUrl, createdAt: new Date().toISOString() },
    ...current,
  ];

  await put(
    INDEX_PATH,
    new Blob([JSON.stringify(updated)], { type: 'application/json' }),
    { access: 'private', addRandomSuffix: false, allowOverwrite: true }
  );
}

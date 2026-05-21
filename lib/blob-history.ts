import { put, list, get, del } from '@vercel/blob';
import { randomUUID } from 'crypto';

export interface HistoryItem {
  id: string;
  atmosphere: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
  productName?: string;
  monthlyPrice?: string;
}

const MAX_PER_SCOPE = 100;
const indexPath = (scope: string) => `history/${scope}/index.json`;
const imagePath = (scope: string, id: string) => `history/${scope}/images/${id}.png`;

export async function readHistory(scope: string): Promise<HistoryItem[]> {
  try {
    const { blobs } = await list({ prefix: indexPath(scope), limit: 1 });
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
  scope: string,
  imageB64: string,
  meta: Pick<HistoryItem, 'atmosphere' | 'aspectRatio'> &
    Partial<Pick<HistoryItem, 'productName' | 'monthlyPrice'>>,
): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const id = randomUUID();
  const buf = Buffer.from(imageB64, 'base64');
  const path = imagePath(scope, id);

  await put(path, new Blob([buf], { type: 'image/png' }), {
    access: 'private',
    addRandomSuffix: false,
  });

  const imageUrl = `/api/blob-proxy?path=${encodeURIComponent(path)}`;

  const current = await readHistory(scope);
  const updated: HistoryItem[] = [
    { id, ...meta, imageUrl, createdAt: new Date().toISOString() },
    ...current,
  ];

  const pruned = updated.slice(0, MAX_PER_SCOPE);
  const removed = updated.slice(MAX_PER_SCOPE);

  await Promise.all(
    removed.map(item =>
      del(imagePath(scope, item.id)).catch(() => undefined),
    ),
  );

  await put(
    indexPath(scope),
    new Blob([JSON.stringify(pruned)], { type: 'application/json' }),
    { access: 'private', addRandomSuffix: false, allowOverwrite: true },
  );
}

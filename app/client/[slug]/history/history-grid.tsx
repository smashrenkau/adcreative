'use client';

import { useState } from 'react';
import type { HistoryItem } from '@/lib/blob-history';

const ASPECT_LABEL: Record<string, string> = {
  square: 'メタ広告',
  landscape: '横動画',
  portrait: '縦動画',
};

export default function HistoryGrid({
  slug,
  items: initialItems,
}: {
  slug: string;
  items: HistoryItem[];
}) {
  const [items, setItems] = useState<HistoryItem[]>(initialItems);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = async (item: HistoryItem) => {
    setDownloadingId(item.id);
    try {
      const res = await fetch(item.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-${item.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (item: HistoryItem) => {
    if (!confirm('この画像を削除しますか？この操作は取り消せません。')) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(
        `/api/client/history?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(item.id)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? '削除に失敗しました');
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500 text-sm">
        履歴がありません。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
          <button
            type="button"
            onClick={() => handleDelete(item)}
            disabled={deletingId === item.id}
            aria-label="削除"
            title="削除"
            className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80 disabled:opacity-50"
          >
            {deletingId === item.id ? '…' : '×'}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.atmosphere}
            className="w-full aspect-square object-cover"
          />
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded">
                {ASPECT_LABEL[item.aspectRatio] ?? item.aspectRatio}
              </span>
              <span>{new Date(item.createdAt).toLocaleString('ja-JP')}</span>
            </div>
            {item.atmosphere && (
              <p className="text-xs text-gray-700 line-clamp-2">{item.atmosphere}</p>
            )}
            <button
              onClick={() => handleDownload(item)}
              disabled={downloadingId === item.id}
              className="w-full text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {downloadingId === item.id ? 'ダウンロード中...' : 'ダウンロード'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

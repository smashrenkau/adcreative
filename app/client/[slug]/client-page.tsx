'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/lib/tenants';

type AspectRatio = 'square' | 'landscape' | 'portrait';

const ASPECT_OPTIONS: { value: AspectRatio; label: string; sub: string }[] = [
  { value: 'square', label: 'メタ広告用', sub: '正方形 1:1' },
  { value: 'landscape', label: '横動画用', sub: '横長 3:2' },
  { value: 'portrait', label: '縦動画用', sub: '縦長 2:3' },
];

export default function ClientGeneratePage({
  tenant,
  initialUsage,
}: {
  tenant: Tenant;
  initialUsage: number;
}) {
  const [atmosphere, setAtmosphere] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(initialUsage);

  const [revisionRequest, setRevisionRequest] = useState('');
  const [revising, setRevising] = useState(false);

  const remaining = tenant.monthly_limit - usage;

  const handleGenerate = async () => {
    if (!atmosphere.trim() || remaining <= 0 || loading) return;

    setLoading(true);
    setError(null);
    setImageB64(null);
    setRevisionRequest('');

    try {
      const res = await fetch('/api/client/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: tenant.slug, atmosphere, aspectRatio }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '生成に失敗しました');

      setImageB64(data.imageB64);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!revisionRequest.trim() || !imageB64 || remaining <= 0 || revising) return;

    setRevising(true);
    setError(null);

    try {
      const res = await fetch('/api/client/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          atmosphere,
          previousImageB64: imageB64,
          revisionRequest,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '修正に失敗しました');

      setImageB64(data.imageB64);
      setUsage(data.usage);
      setRevisionRequest('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修正に失敗しました');
    } finally {
      setRevising(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-500 mt-1">AI 広告クリエイター</p>
          </div>
          <Link href="/history" className="text-sm text-blue-600 hover:underline">
            生成履歴 →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">画像サイズ</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAspectRatio(opt.value)}
                  className={`border rounded-lg p-3 text-sm transition-colors ${
                    aspectRatio === opt.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              画像の雰囲気・スタイル
            </label>
            <textarea
              value={atmosphere}
              onChange={e => setAtmosphere(e.target.value)}
              placeholder="例: 秋らしい温かみのある色合い&#10;例: シンプルでモダンなデザイン&#10;例: 高級感があり落ち着いたトーン"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-900 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              今月の残り:{' '}
              <span className={`font-semibold ${remaining === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {remaining}
              </span>{' '}
              / {tenant.monthly_limit} 枚
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading || !atmosphere.trim() || remaining <= 0}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {loading ? '生成中...' : '画像を生成する'}
            </button>
          </div>

          {remaining === 0 && (
            <p className="text-red-500 text-sm">
              今月の生成上限に達しました。翌月にリセットされます。
            </p>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {(loading || revising) && (
          <div className="bg-white rounded-xl shadow-sm p-12 flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {imageB64 && !loading && !revising && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${imageB64}`}
              alt="生成された広告"
              className="w-full rounded-lg"
            />
            <a
              href={`data:image/png;base64,${imageB64}`}
              download={`ad-${tenant.slug}-${Date.now()}.png`}
              className="flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              ダウンロード
            </a>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                この画像を修正する
              </label>
              <textarea
                value={revisionRequest}
                onChange={e => setRevisionRequest(e.target.value)}
                placeholder="例: もう少し明るい色合いにして&#10;例: キャッチコピーを「秋のキャンペーン開催中」に変更&#10;例: 商品をもう少し大きく表示"
                className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-900 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={revising}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">修正にも1枚分の生成数を消費します</p>
                <button
                  onClick={handleRevise}
                  disabled={revising || !revisionRequest.trim() || remaining <= 0}
                  className="bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors"
                >
                  {revising ? '修正中...' : '修正する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

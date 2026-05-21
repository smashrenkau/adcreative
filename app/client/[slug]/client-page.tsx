'use client';

import { useState } from 'react';
import type { Tenant } from '@/lib/tenants';

export default function ClientGeneratePage({
  tenant,
  initialUsage,
}: {
  tenant: Tenant;
  initialUsage: number;
}) {
  const [atmosphere, setAtmosphere] = useState('');
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState(initialUsage);

  const remaining = tenant.monthly_limit - usage;

  const handleGenerate = async () => {
    if (!atmosphere.trim() || remaining <= 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/client/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: tenant.slug, atmosphere }),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{tenant.name}</h1>
          <p className="text-sm text-gray-500 mt-1">AI 広告クリエイター</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            画像の雰囲気・スタイル
          </label>
          <textarea
            value={atmosphere}
            onChange={e => setAtmosphere(e.target.value)}
            placeholder="例: 秋らしい温かみのある色合い&#10;例: シンプルでモダンなデザイン&#10;例: 高級感があり落ち着いたトーン"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <div className="flex items-center justify-between mt-4">
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
            <p className="text-red-500 text-sm mt-3">
              今月の生成上限に達しました。翌月にリセットされます。
            </p>
          )}

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-12 flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {imageB64 && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <img
              src={`data:image/png;base64,${imageB64}`}
              alt="生成された広告"
              className="w-full rounded-lg"
            />
            <a
              href={`data:image/png;base64,${imageB64}`}
              download="ad-creative.png"
              className="mt-3 flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              ダウンロード
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

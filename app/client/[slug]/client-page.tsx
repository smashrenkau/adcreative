'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/lib/tenants';

type AspectRatio = 'square' | 'landscape' | 'portrait';

const ASPECT_OPTIONS: { value: AspectRatio; label: string; sub: string; shape: string }[] = [
  { value: 'square', label: 'メタ広告用', sub: '正方形 1:1', shape: 'w-7 h-7' },
  { value: 'landscape', label: '横動画用', sub: '横長 3:2', shape: 'w-9 h-6' },
  { value: 'portrait', label: '縦動画用', sub: '縦長 2:3', shape: 'w-6 h-9' },
];

function SparkleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15l-1.6-4.2L6 9.2l4.4-1.6L12 3z"
        fill="url(#sparkle-grad)"
      />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" fill="url(#sparkle-grad)" />
      <defs>
        <linearGradient id="sparkle-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/60">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200/50 to-indigo-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-cyan-200/40 to-sky-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-violet-200/30 to-blue-200/20 blur-3xl"
      />

      <div className="relative max-w-2xl mx-auto p-6 pt-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              {tenant.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
              <SparkleIcon />
              AI 広告クリエイター
            </p>
          </div>
          <Link
            href="/history"
            className="text-sm text-blue-600 hover:text-indigo-600 underline-offset-4 hover:underline transition-colors"
          >
            生成履歴 →
          </Link>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/70 shadow-xl shadow-blue-100/40 p-6 mb-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">画像サイズ</label>
            <div className="grid grid-cols-3 gap-2.5">
              {ASPECT_OPTIONS.map(opt => {
                const active = aspectRatio === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    className={`group border rounded-xl p-3 text-sm transition-all ${
                      active
                        ? 'border-indigo-400 bg-gradient-to-br from-blue-50 to-indigo-50 text-indigo-700 shadow-md shadow-indigo-100'
                        : 'border-slate-200 bg-white/60 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex justify-center mb-2 h-9 items-center">
                      <div
                        className={`${opt.shape} rounded-md transition-all ${
                          active
                            ? 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm shadow-indigo-300/50'
                            : 'bg-gradient-to-br from-slate-200 to-slate-300 group-hover:from-slate-300 group-hover:to-slate-400'
                        }`}
                      />
                    </div>
                    <div className="font-medium">{opt.label}</div>
                    <div className={`text-xs mt-0.5 ${active ? 'text-indigo-500/80' : 'text-slate-400'}`}>
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              画像の雰囲気・スタイル
            </label>
            <textarea
              value={atmosphere}
              onChange={e => setAtmosphere(e.target.value)}
              placeholder="例: 秋らしい温かみのある色合い&#10;例: シンプルでモダンなデザイン&#10;例: 高級感があり落ち着いたトーン"
              className="w-full border border-slate-200 bg-white/80 rounded-xl p-3.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300 transition-all"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-500">
              今月の残り:{' '}
              <span
                className={`font-semibold ${remaining === 0 ? 'text-red-500' : 'text-slate-800'}`}
              >
                {remaining}
              </span>{' '}
              / {tenant.monthly_limit} 枚
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading || !atmosphere.trim() || remaining <= 0}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
            >
              {!loading && <SparkleIcon className="w-3.5 h-3.5" />}
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
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/70 shadow-xl shadow-blue-100/40 p-12 flex flex-col items-center gap-3">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-blue-500 animate-spin" />
            </div>
            <p className="text-xs text-slate-500">画像を生成しています…</p>
          </div>
        )}

        {imageB64 && !loading && !revising && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/70 shadow-xl shadow-blue-100/40 p-4 space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${imageB64}`}
              alt="生成された広告"
              className="w-full rounded-xl"
            />
            <a
              href={`data:image/png;base64,${imageB64}`}
              download={`ad-${tenant.slug}-${Date.now()}.png`}
              className="flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-indigo-600 hover:underline underline-offset-4"
            >
              ダウンロード
            </a>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                この画像を修正する
              </label>
              <textarea
                value={revisionRequest}
                onChange={e => setRevisionRequest(e.target.value)}
                placeholder="例: もう少し明るい色合いにして&#10;例: キャッチコピーを「秋のキャンペーン開催中」に変更&#10;例: 商品をもう少し大きく表示"
                className="w-full border border-slate-200 bg-white/80 rounded-xl p-3.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300 transition-all"
                disabled={revising}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-400">修正にも1枚分の生成数を消費します</p>
                <button
                  onClick={handleRevise}
                  disabled={revising || !revisionRequest.trim() || remaining <= 0}
                  className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-md shadow-slate-300/40 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
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

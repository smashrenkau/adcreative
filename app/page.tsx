'use client';

import { useState, useEffect, useRef } from 'react';

type AspectRatio = 'square' | 'portrait' | 'landscape';

interface UploadedImage {
  b64: string;
  mime: string;
  filename: string;
}

const ASPECT_OPTIONS = [
  { value: 'square' as const, label: '正方形', sub: '1 : 1', preview: 'w-12 h-12' },
  { value: 'portrait' as const, label: '縦型', sub: '9 : 16', preview: 'w-8 h-14' },
  { value: 'landscape' as const, label: '横型', sub: '16 : 9', preview: 'w-14 h-8' },
];

const ASPECT_CLASS: Record<AspectRatio, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[9/16]',
  landscape: 'aspect-video',
};

function Spinner({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const s = { sm: 'w-4 h-4 border-2', lg: 'w-14 h-14 border-4' }[size];
  return <div className={`${s} border-blue-100 border-t-blue-500 rounded-full animate-spin flex-shrink-0`} />;
}

export default function Home() {
  // デフォルト訴求ポイント
  const [defaults, setDefaults] = useState('');
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  // 入力
  const [productName, setProductName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');

  // 画像
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const [processedB64, setProcessedB64] = useState<string | null>(null);
  const [bgProcessing, setBgProcessing] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 生成
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisionRequest, setRevisionRequest] = useState('');
  const [revising, setRevising] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/defaults').then(r => r.json()).then(d => setDefaults(d.content ?? ''));
  }, []);

  const saveDefaults = async () => {
    setDefaultsSaving(true);
    await fetch('/api/defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: defaults }),
    });
    setDefaultsSaving(false);
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 2000);
  };

  // 画像ファイルを読み込む
  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const [header, b64] = dataUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      setUploaded({ b64, mime, filename: file.name });
      setProcessedB64(null);
      setBgError(null);
      setGeneratedImage(null);
      setGenError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  // 背景透過
  const removeBg = async () => {
    if (!uploaded) return;
    setBgProcessing(true);
    setBgError(null);
    setProcessedB64(null);
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageB64: uploaded.b64, mimeType: uploaded.mime, filename: uploaded.filename }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProcessedB64(data.imageB64);
    } catch (e: unknown) {
      setBgError(e instanceof Error ? e.message : '失敗しました');
    } finally {
      setBgProcessing(false);
    }
  };

  // 使用する画像（透過済み優先）
  const activeImageB64 = processedB64 ?? uploaded?.b64 ?? null;

  const canGenerate = productName.trim() !== '' && monthlyPrice.trim() !== '' && atmosphere.trim() !== '' && !generating;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedImage(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          monthlyPrice,
          atmosphere,
          aspectRatio,
          productImageB64: activeImageB64,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedImage(data.imageB64);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : '生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevise = async () => {
    if (!revisionRequest.trim() || !generatedImage || revising) return;
    setRevising(true);
    setGenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          monthlyPrice,
          atmosphere,
          aspectRatio,
          revisionRequest,
          previousImageB64: generatedImage,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedImage(data.imageB64);
      setRevisionRequest('');
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : '修正に失敗しました');
    } finally {
      setRevising(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">広告クリエイティブ生成</h1>
          <p className="text-slate-500 mt-1 text-sm">AI（GPT-image-2）を使って広告クリエイティブを自動生成します</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ===== 左: 入力フォーム ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-100 pb-3">入力設定</h2>

            {/* デフォルト訴求ポイント */}
            <div className="border border-amber-200 rounded-xl bg-amber-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setDefaultsOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">★</span>
                  <span className="text-sm font-medium text-amber-800">デフォルト訴求ポイント（毎回自動で反映）</span>
                </div>
                <svg className={`w-4 h-4 text-amber-400 transition-transform ${defaultsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {defaultsOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-amber-200">
                  <p className="text-xs text-amber-600 pt-3">ここに書いた内容は毎回の生成に自動で組み込まれます。AIが状況に合わせて言い換えます。</p>
                  <textarea
                    value={defaults}
                    onChange={e => setDefaults(e.target.value)}
                    rows={7}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-slate-700 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={saveDefaults}
                    disabled={defaultsSaving}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {defaultsSaved ? '✓ 保存しました' : defaultsSaving ? '保存中...' : '変更を保存'}
                  </button>
                </div>
              )}
            </div>

            {/* 商品名 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">商品名</label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="例: iPhone 17 Pro、エアコン、スキンケアセット"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            {/* 商品画像 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600">商品画像</label>

              {!uploaded ? (
                /* アップロードエリア */
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 bg-slate-50 hover:bg-blue-50'}`}
                >
                  <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-slate-500">クリックまたはドラッグ＆ドロップ</p>
                  <p className="text-xs text-slate-400 mt-1">PNG / JPG / WEBP</p>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileInput} />
                </div>
              ) : (
                /* 画像プレビュー＋背景透過 */
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* 元画像 / 透過後 の並列表示 */}
                  <div className={`grid ${processedB64 ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-slate-100`}>
                    {/* 元画像 */}
                    <div className="p-3 space-y-1">
                      <p className="text-xs text-slate-400">元画像</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${uploaded.mime};base64,${uploaded.b64}`}
                        alt="元画像"
                        className="w-full h-36 object-contain rounded bg-slate-100"
                      />
                    </div>
                    {/* 透過後 */}
                    {processedB64 && (
                      <div className="p-3 space-y-1">
                        <p className="text-xs text-slate-400">透過後</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:image/png;base64,${processedB64}`}
                          alt="透過後"
                          className="w-full h-36 object-contain rounded"
                          style={{ background: 'repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%) 0 0 / 14px 14px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 操作ボタン */}
                  <div className="p-3 border-t border-slate-100 flex gap-2">
                    {!processedB64 ? (
                      <button
                        type="button"
                        onClick={removeBg}
                        disabled={bgProcessing}
                        className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {bgProcessing ? <><Spinner size="sm" /><span>透過処理中...</span></> : '背景透過'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={removeBg}
                        disabled={bgProcessing}
                        className="flex-1 py-2 border border-violet-300 hover:bg-violet-50 text-violet-600 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {bgProcessing ? <><Spinner size="sm" /><span>処理中...</span></> : '背景透過をやり直す'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setUploaded(null); setProcessedB64(null); setBgError(null); }}
                      className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-400 text-xs rounded-lg transition-colors"
                    >
                      削除
                    </button>
                  </div>

                  {bgError && (
                    <p className="text-xs text-red-500 bg-red-50 px-3 py-2 border-t border-red-100">{bgError}</p>
                  )}

                  {processedB64 && (
                    <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 border-t border-emerald-100 text-center">
                      ✓ 透過済み画像をクリエイティブ生成に使用します
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 月額料金 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">月々の料金</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm whitespace-nowrap">月々</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthlyPrice}
                  onChange={e => setMonthlyPrice(e.target.value)}
                  placeholder="9,800"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                <span className="text-slate-500 text-sm whitespace-nowrap">円〜</span>
              </div>
            </div>

            {/* クリエイティブの雰囲気 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">クリエイティブの雰囲気</label>
              <textarea
                value={atmosphere}
                onChange={e => setAtmosphere(e.target.value)}
                placeholder="例: シンプルでスタイリッシュ、白背景、高級感のあるデザイン、ターゲットは30代女性..."
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
              />
            </div>

            {/* 縦横比 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600">縦横比</label>
              <div className="flex gap-3">
                {ASPECT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    className={`flex-1 py-3 px-2 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className={`${opt.preview} rounded border-2 ${aspectRatio === opt.value ? 'border-blue-400 bg-blue-100' : 'border-slate-300 bg-slate-100'}`} />
                    <div className={`text-xs font-semibold ${aspectRatio === opt.value ? 'text-blue-700' : 'text-slate-600'}`}>{opt.label}</div>
                    <div className="text-xs text-slate-400">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成ボタン */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  生成中...
                </span>
              ) : 'クリエイティブを生成'}
            </button>

            {genError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                <strong>エラー: </strong>{genError}
              </div>
            )}
          </div>

          {/* ===== 右: 生成結果 ===== */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-100 pb-3">生成結果</h2>

            {(generating || revising) ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Spinner size="lg" />
                <p className="text-slate-400 text-sm">{revising ? '修正中です...' : 'AIが広告を生成中です...'}</p>
                <p className="text-slate-300 text-xs">通常30〜60秒かかります</p>
              </div>
            ) : generatedImage ? (
              <div className="space-y-4">
                <div className={`${ASPECT_CLASS[aspectRatio]} relative w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-200 shadow-sm`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${generatedImage}`} alt="生成された広告" className="w-full h-full object-cover" />
                </div>

                <a
                  href={`data:image/png;base64,${generatedImage}`}
                  download={`${productName || 'creative'}_ad.png`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ダウンロード
                </a>

                {/* 修正 */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-600">修正依頼</h3>
                  <textarea
                    value={revisionRequest}
                    onChange={e => setRevisionRequest(e.target.value)}
                    placeholder="例: 背景をもっと明るくして。テキストを大きくして。"
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleRevise}
                    disabled={!revisionRequest.trim() || revising}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    修正する
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-center">
                  左のフォームを入力して<br />「クリエイティブを生成」を押してください
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

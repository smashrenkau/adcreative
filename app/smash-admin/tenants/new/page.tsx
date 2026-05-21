'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTenantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    slug: '',
    name: '',
    monthly_limit: '30',
    base_prompt: '',
    active: false,
  });

  const set = (key: string, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/smash-admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthly_limit: Number(form.monthly_limit) }),
    });

    setSaving(false);
    if (res.ok) {
      router.push('/smash-admin');
    } else {
      const data = await res.json();
      setError(data.error ?? '保存に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/smash-admin" className="text-gray-400 hover:text-gray-600 text-sm">
            ← テナント一覧
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">新規テナント追加</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <Field label="テナント名 *" hint="管理画面での表示名（例: A建設株式会社）">
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="例: A建設株式会社"
              className={inputClass}
            />
          </Field>

          <Field label="サブドメイン (slug) *" hint="英数字・ハイフンのみ。このURLでユーザーがアクセスします。">
            <input
              type="text"
              required
              value={form.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="例: a-construction"
              className={inputClass}
            />
            {form.slug && (
              <p className="text-xs text-gray-400 mt-1">
                ユーザーURL: {form.slug}.smash-inc.co.jp
              </p>
            )}
          </Field>

          <Field label="月間生成上限（枚）">
            <input
              type="number"
              min="1"
              max="999"
              value={form.monthly_limit}
              onChange={e => set('monthly_limit', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="広告生成プロンプト（ベース設定）"
            hint="AIへの指示を自由に記述してください。業種・サービス内容・必須訴求・デザインルールなど何でもOK。ユーザーには表示されません。"
          >
            <textarea
              value={form.base_prompt}
              onChange={e => set('base_prompt', e.target.value)}
              placeholder={`例（建設会社の場合）:\n日本の建設会社「〇〇建設」の広告クリエイティブを生成してください。\n\n【会社情報】\n- 創業50年の地元密着型工務店\n- 戸建て住宅・リフォームが専門\n\n【必須訴求ポイント】\n- 無料見積もり実施中\n- 地元での実績1000件以上\n- アフターサポート充実\n\n【デザインルール】\n- 信頼感・安心感のある落ち着いたデザイン\n- キャッチコピーを目立つ場所に配置すること\n- 会社名「〇〇建設」を必ず入れること`}
              rows={14}
              className={`${inputClass} resize-y font-mono text-xs`}
            />
          </Field>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              有効化（振込確認後にオンにする）
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '作成する'}
            </button>
            <Link
              href="/smash-admin"
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass = 'w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

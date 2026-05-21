'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Tenant } from '@/lib/tenants';

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    slug: '',
    name: '',
    monthly_limit: '30',
    base_prompt: '',
    active: false,
  });

  useEffect(() => {
    fetch('/api/smash-admin/tenants')
      .then(r => r.json())
      .then((list: Tenant[]) => {
        const found = list.find(t => String(t.id) === id);
        if (found) {
          setTenant(found);
          setForm({
            slug: found.slug,
            name: found.name,
            monthly_limit: String(found.monthly_limit),
            base_prompt: found.base_prompt,
            active: found.active,
          });
        }
      });
  }, [id]);

  const set = (key: string, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch(`/api/smash-admin/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthly_limit: Number(form.monthly_limit) }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage('保存しました');
    } else {
      const data = await res.json();
      setError(data.error ?? '保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${tenant?.name}」を削除しますか？この操作は取り消せません。`)) return;
    setDeleting(true);
    await fetch(`/api/smash-admin/tenants/${id}`, { method: 'DELETE' });
    router.push('/smash-admin');
  };

  const handleResetUsage = async () => {
    if (!confirm('今月の使用枚数をリセットしますか？')) return;
    setResetting(true);
    setMessage('');
    const res = await fetch('/api/smash-admin/reset-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: form.slug }),
    });
    setResetting(false);
    setMessage(res.ok ? '今月の使用枚数をリセットしました' : 'リセットに失敗しました');
  };

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/smash-admin" className="text-gray-400 hover:text-gray-600 text-sm">
            ← テナント一覧
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">編集: {tenant.name}</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <Field label="テナント名 *">
            <input
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="サブドメイン (slug)" hint="変更すると既存のURLが変わります">
            <input
              type="text"
              required
              value={form.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              ユーザーURL: {form.slug}.smash-inc.co.jp
            </p>
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
            hint="AIへの指示を自由に記述。業種・サービス・必須訴求・デザインルールなど何でもOK。ユーザーには表示されません。"
          >
            <textarea
              value={form.base_prompt}
              onChange={e => set('base_prompt', e.target.value)}
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
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            <Link
              href="/smash-admin"
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              戻る
            </Link>
          </div>
        </form>

        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">操作</h2>
          <div className="flex gap-3">
            <button
              onClick={handleResetUsage}
              disabled={resetting}
              className="text-sm text-orange-600 border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-50 disabled:opacity-50"
            >
              {resetting ? '処理中...' : '今月の使用枚数をリセット'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? '削除中...' : 'テナントを削除'}
            </button>
          </div>
        </div>
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

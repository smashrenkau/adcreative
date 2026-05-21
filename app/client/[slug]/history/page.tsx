import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenants';
import { readHistory } from '@/lib/blob-history';
import HistoryGrid from './history-grid';

export const dynamic = 'force-dynamic';

export default async function ClientHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">このページは存在しません。</p>
      </div>
    );
  }

  const items = process.env.BLOB_READ_WRITE_TOKEN ? await readHistory(slug) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-500 mt-1">生成履歴（最新{items.length}件 / 最大100件）</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 生成画面に戻る
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500 text-sm">
            まだ生成履歴がありません。
          </div>
        ) : (
          <HistoryGrid items={items} />
        )}
      </div>
    </div>
  );
}

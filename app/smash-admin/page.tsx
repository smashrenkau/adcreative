import Link from 'next/link';
import { getAllTenants, getUsage, getYearMonth } from '@/lib/tenants';
import AdminLogoutButton from './logout-button';
import SetupButton from './setup-button';

export default async function AdminDashboard() {
  let tenants: Awaited<ReturnType<typeof getAllTenants>> = [];
  let dbError = '';

  try {
    tenants = await getAllTenants();
  } catch {
    dbError = 'DBに接続できません。セットアップを実行してください。';
  }

  const yearMonth = getYearMonth();

  const tenantsWithUsage = dbError
    ? []
    : await Promise.all(
        tenants.map(async t => ({
          ...t,
          usage: await getUsage(t.slug, yearMonth),
        })),
      );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">テナント管理</h1>
            <p className="text-sm text-gray-500 mt-1">{yearMonth} の利用状況</p>
          </div>
          <div className="flex items-center gap-3">
            <SetupButton />
            <Link
              href="/smash-admin/tenants/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + 新規テナント追加
            </Link>
            <AdminLogoutButton />
          </div>
        </div>

        {dbError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            {dbError}
          </div>
        )}

        {!dbError && tenantsWithUsage.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500 shadow-sm">
            テナントがまだありません。「新規テナント追加」から作成してください。
          </div>
        )}

        {tenantsWithUsage.length > 0 && (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">テナント名</th>
                  <th className="text-left p-4 font-medium text-gray-600">サブドメイン</th>
                  <th className="text-left p-4 font-medium text-gray-600">今月の使用</th>
                  <th className="text-left p-4 font-medium text-gray-600">ステータス</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenantsWithUsage.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{t.name}</td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{t.slug}</td>
                    <td className="p-4">
                      <span className={t.usage >= t.monthly_limit ? 'text-red-600 font-medium' : ''}>
                        {t.usage} / {t.monthly_limit}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {t.active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/smash-admin/tenants/${t.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

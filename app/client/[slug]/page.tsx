import { getTenantBySlug, getUsage, getYearMonth } from '@/lib/tenants';
import ClientGeneratePage from './client-page';

export default async function ClientTenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let tenant: Awaited<ReturnType<typeof getTenantBySlug>> = null;
  try {
    tenant = await getTenantBySlug(slug);
  } catch {
    return <ErrorPage message="サービスに接続できません。しばらくしてから再度お試しください。" />;
  }

  if (!tenant) {
    return <ErrorPage message="このページは存在しません。" />;
  }

  if (!tenant.active) {
    return <ErrorPage message="このサービスは現在ご利用いただけません。" />;
  }

  const currentUsage = await getUsage(slug, getYearMonth());

  return <ClientGeneratePage tenant={tenant} initialUsage={currentUsage} />;
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

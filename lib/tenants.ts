import { getSql } from './db';

export type Tenant = {
  id: number;
  slug: string;
  name: string;
  base_prompt: string;
  active: boolean;
  monthly_limit: number;
  logo_url: string | null;
};

export function getYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM tenants WHERE slug = ${slug} LIMIT 1`;
  return (rows[0] as Tenant) ?? null;
}

export async function getAllTenants(): Promise<Tenant[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM tenants ORDER BY created_at DESC`;
  return rows as Tenant[];
}

export async function createTenant(data: Omit<Tenant, 'id'>): Promise<Tenant> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO tenants (slug, name, base_prompt, active, monthly_limit, logo_url)
    VALUES (${data.slug}, ${data.name}, ${data.base_prompt}, ${data.active}, ${data.monthly_limit}, ${data.logo_url})
    RETURNING *
  `;
  return rows[0] as Tenant;
}

export async function updateTenant(id: number, data: Omit<Tenant, 'id'>): Promise<Tenant> {
  const sql = getSql();
  const rows = await sql`
    UPDATE tenants SET
      slug = ${data.slug},
      name = ${data.name},
      base_prompt = ${data.base_prompt},
      active = ${data.active},
      monthly_limit = ${data.monthly_limit},
      logo_url = ${data.logo_url}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] as Tenant;
}

export async function deleteTenant(id: number): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM tenants WHERE id = ${id}`;
}

export async function getUsage(slug: string, yearMonth: string): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT count FROM usage WHERE tenant_slug = ${slug} AND year_month = ${yearMonth}
  `;
  return (rows[0] as { count: number })?.count ?? 0;
}

export async function incrementUsage(slug: string, yearMonth: string): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO usage (tenant_slug, year_month, count)
    VALUES (${slug}, ${yearMonth}, 1)
    ON CONFLICT (tenant_slug, year_month)
    DO UPDATE SET count = usage.count + 1
    RETURNING count
  `;
  return (rows[0] as { count: number })?.count ?? 1;
}

export async function resetUsage(slug: string, yearMonth: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE usage SET count = 0
    WHERE tenant_slug = ${slug} AND year_month = ${yearMonth}
  `;
}

import { NextRequest, NextResponse } from 'next/server';
import { getAllTenants, createTenant } from '@/lib/tenants';

export async function GET() {
  try {
    const tenants = await getAllTenants();
    return NextResponse.json(tenants);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, base_prompt, active, monthly_limit, logo_url } = body;

    if (!slug || !name) {
      return NextResponse.json({ error: 'slug と name は必須です' }, { status: 400 });
    }

    const tenant = await createTenant({
      slug,
      name,
      base_prompt: base_prompt ?? '',
      active: active ?? false,
      monthly_limit: monthly_limit ?? 30,
      logo_url: logo_url ?? null,
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { updateTenant, deleteTenant } from '@/lib/tenants';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { slug, name, base_prompt, active, monthly_limit } = body;

    const tenant = await updateTenant(Number(id), {
      slug,
      name,
      base_prompt: base_prompt ?? '',
      active: active ?? false,
      monthly_limit: monthly_limit ?? 30,
    });

    return NextResponse.json(tenant);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTenant(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

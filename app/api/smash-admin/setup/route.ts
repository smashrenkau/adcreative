import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function POST() {
  try {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        base_prompt TEXT NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT false,
        monthly_limit INTEGER NOT NULL DEFAULT 30,
        logo_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT`;

    await sql`
      CREATE TABLE IF NOT EXISTS usage (
        id SERIAL PRIMARY KEY,
        tenant_slug TEXT NOT NULL,
        year_month TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(tenant_slug, year_month)
      )
    `;

    return NextResponse.json({ ok: true, message: 'テーブルの作成・更新が完了しました' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

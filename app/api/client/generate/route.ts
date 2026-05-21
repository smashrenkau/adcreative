import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTenantBySlug, getUsage, incrementUsage, getYearMonth } from '@/lib/tenants';

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(basePrompt: string, atmosphere: string): string {
  return `${basePrompt}

【ユーザー指定の雰囲気・イメージ】
${atmosphere}`;
}

export async function POST(request: NextRequest) {
  try {
    const { tenantSlug, atmosphere } = await request.json();

    if (!tenantSlug || !atmosphere?.trim()) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
    }

    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    }

    if (!tenant.active) {
      return NextResponse.json({ error: 'このサービスは現在利用できません' }, { status: 403 });
    }

    const yearMonth = getYearMonth();
    const currentUsage = await getUsage(tenantSlug, yearMonth);

    if (currentUsage >= tenant.monthly_limit) {
      return NextResponse.json(
        { error: `今月の生成上限（${tenant.monthly_limit}枚）に達しました` },
        { status: 429 },
      );
    }

    const prompt = buildPrompt(tenant.base_prompt, atmosphere);

    const res = await getOpenAI().images.generate({
      model: 'gpt-image-2',
      prompt,
      size: '1024x1024',
    });

    const imageB64 = res.data?.[0]?.b64_json;
    if (!imageB64) throw new Error('画像の生成に失敗しました');

    const newUsage = await incrementUsage(tenantSlug, yearMonth);

    return NextResponse.json({ imageB64, usage: newUsage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[client/generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

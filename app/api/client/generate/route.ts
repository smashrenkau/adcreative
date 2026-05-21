import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { head, get } from '@vercel/blob';
import { getTenantBySlug, getUsage, incrementUsage, getYearMonth } from '@/lib/tenants';
import { appendHistory } from '@/lib/blob-history';

export const maxDuration = 300;

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Size = '1024x1024' | '1024x1536' | '1536x1024';
const SIZE_MAP: Record<string, Size> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
};

function buildPrompt(basePrompt: string, atmosphere: string): string {
  return `${basePrompt}

【ユーザー指定の雰囲気・イメージ】
${atmosphere}`;
}

function buildRevisionPrompt(basePrompt: string, atmosphere: string, revisionRequest: string): string {
  return `以下の広告画像を修正してください。

修正内容: ${revisionRequest}

【元の方針】
${basePrompt}

${atmosphere ? `【元の雰囲気指定】\n${atmosphere}` : ''}`;
}

async function fetchLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  try {
    const u = new URL(logoUrl, 'http://x');
    const path = u.searchParams.get('path');
    if (!path) return null;
    const blob = await head(path);
    const result = await get(blob.url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const ab = await new Response(result.stream).arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function findQuietestPosition(
  baseBuffer: Buffer,
  bw: number,
  bh: number,
  bgW: number,
  bgH: number,
  pad: number,
): Promise<{ left: number; top: number }> {
  const candidates: { left: number; top: number }[] = [
    { left: pad, top: pad },                              // top-left
    { left: Math.round((bw - bgW) / 2), top: pad },       // top-center
    { left: bw - bgW - pad, top: pad },                   // top-right
    { left: pad, top: bh - bgH - pad },                   // bottom-left
    { left: Math.round((bw - bgW) / 2), top: bh - bgH - pad }, // bottom-center
    { left: bw - bgW - pad, top: bh - bgH - pad },        // bottom-right
  ];

  const scored = await Promise.all(
    candidates.map(async pos => {
      if (pos.left < 0 || pos.top < 0 || pos.left + bgW > bw || pos.top + bgH > bh) {
        return { pos, score: Infinity };
      }
      try {
        const stats = await sharp(baseBuffer)
          .extract({ left: pos.left, top: pos.top, width: bgW, height: bgH })
          .stats();
        const rgb = stats.channels.slice(0, 3);
        const avgStdev = rgb.reduce((s, c) => s + c.stdev, 0) / rgb.length;
        return { pos, score: avgStdev };
      } catch {
        return { pos, score: Infinity };
      }
    }),
  );

  scored.sort((a, b) => a.score - b.score);
  return scored[0].pos;
}

async function compositeLogo(baseB64: string, logoBuffer: Buffer): Promise<string> {
  const baseBuffer = Buffer.from(baseB64, 'base64');
  const baseMeta = await sharp(baseBuffer).metadata();
  const bw = baseMeta.width ?? 1024;
  const bh = baseMeta.height ?? 1024;

  const targetLogoW = Math.round(bw * 0.18);
  const logoResized = await sharp(logoBuffer)
    .resize({ width: targetLogoW, withoutEnlargement: false })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const lw = logoMeta.width ?? targetLogoW;
  const lh = logoMeta.height ?? targetLogoW;

  const pad = Math.round(bw * 0.035);
  const { left, top } = await findQuietestPosition(baseBuffer, bw, bh, lw, lh, pad);

  const out = await sharp(baseBuffer)
    .composite([{ input: logoResized, left, top }])
    .png()
    .toBuffer();

  return out.toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const { tenantSlug, atmosphere, aspectRatio, previousImageB64, revisionRequest } =
      await request.json();

    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug が必要です' }, { status: 400 });
    }

    const isRevision = !!previousImageB64 && !!revisionRequest?.trim();
    if (!isRevision && !atmosphere?.trim()) {
      return NextResponse.json({ error: '雰囲気を入力してください' }, { status: 400 });
    }

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
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

    const size = SIZE_MAP[aspectRatio] ?? '1024x1024';
    let imageB64: string | undefined;

    if (isRevision) {
      const prompt = buildRevisionPrompt(tenant.base_prompt, atmosphere ?? '', revisionRequest);
      const buf = Buffer.from(previousImageB64, 'base64');
      const imageFile = new File([buf], 'previous.png', { type: 'image/png' });

      const res = await getOpenAI().images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt,
        size: '1024x1024',
      });
      imageB64 = res.data?.[0]?.b64_json;
    } else {
      const prompt = buildPrompt(tenant.base_prompt, atmosphere);
      const res = await getOpenAI().images.generate({
        model: 'gpt-image-2',
        prompt,
        size,
      });
      imageB64 = res.data?.[0]?.b64_json;
    }

    if (!imageB64) throw new Error('画像の生成に失敗しました');

    if (tenant.logo_url) {
      const logoBuffer = await fetchLogoBuffer(tenant.logo_url);
      if (logoBuffer) {
        try {
          imageB64 = await compositeLogo(imageB64, logoBuffer);
        } catch (e) {
          console.error('[logo composite failed]', e);
        }
      }
    }

    await appendHistory(tenant.slug, imageB64, {
      atmosphere: atmosphere ?? '',
      aspectRatio: aspectRatio ?? 'square',
    });

    const newUsage = await incrementUsage(tenantSlug, yearMonth);

    return NextResponse.json({ imageB64, usage: newUsage });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[client/generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

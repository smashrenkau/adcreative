import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { appendHistory } from '@/lib/blob-history';

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Size = '1024x1024' | '1024x1536' | '1536x1024';

const SIZE_MAP: Record<string, Size> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
};

const VARIATION_HINTS = [
  'シンプル・ミニマルで余白を活かしたレイアウト。洗練されたスペースの使い方を意識する',
  'ビビッドなカラーとインパクト重視の大胆な構成。視線を一瞬でつかむデザイン',
  'ナチュラルで温かみのある雰囲気。柔らかいトーンと自然素材感のあるデザイン',
  'ダークトーンで高級感・上質感を演出。黒や深いネイビーを基調とした洗練されたデザイン',
  'パステルカラーで柔らかく親しみやすい印象。明るく爽やかなデザイン',
  '大きな文字組みをメインに据えた訴求力重視のデザイン。テキストが主役',
  '幾何学的なシェイプを活用したモダンなデザイン。直線や円を効果的に使用',
  'グラデーション背景を活用した洗練されたデザイン。色の移り変わりが印象的',
  '斜めラインやダイナミックな構図のエネルギッシュなデザイン。動きと躍動感を演出',
  'ポップでカジュアル、幅広い層に親しみやすいデザイン。カラフルで明るい雰囲気',
];

function loadDefaults(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'prompts', 'defaults.md'), 'utf-8');
  } catch {
    return '';
  }
}

function buildPrompt(
  productName: string,
  monthlyPrice: string,
  atmosphere: string,
  defaults: string,
  revisionRequest?: string,
  variationIndex?: number,
  totalCount?: number,
) {
  if (revisionRequest) {
    return `以下の広告画像を修正してください。
修正内容: ${revisionRequest}

元の広告情報:
商品名: ${productName}
月々: ${monthlyPrice}円〜
雰囲気: ${atmosphere}

${defaults ? `【必須訴求ポイント（維持すること）】\n${defaults}` : ''}`;
  }

  const showVariation = variationIndex !== undefined && totalCount !== undefined && totalCount > 1;
  const variationHint = showVariation
    ? `\n【デザインバリエーション ${variationIndex! + 1}/${totalCount}】\nこのバリエーションのデザイン方向性: ${VARIATION_HINTS[variationIndex! % VARIATION_HINTS.length]}\n`
    : '';

  return `日本の広告クリエイティブを生成してください。
${variationHint}
【商品情報】
商品名: ${productName}
月々: ${monthlyPrice}円〜
デザインの雰囲気・スタイル: ${atmosphere}

【必ず守るルール】
1. キャッチコピーを新しく考えて画像の目立つ場所に配置する（毎回ユニークなコピーにすること）
2. 「月々${monthlyPrice}円〜」を大きく目立つように表示する
3. 商品名「${productName}」を含める

${defaults ? `【必須訴求ポイント】\n以下の内容を必ず広告に盛り込むこと。文言はそのまま使わず、雰囲気に合わせて自然に言い換えること。\n${defaults}` : ''}

プロフェッショナルで魅力的な日本語広告デザインにしてください。`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productName, monthlyPrice, atmosphere, aspectRatio,
      productFilename, productImageB64, previousImageB64, revisionRequest,
      variationIndex, totalCount,
    } = body;

    const size = SIZE_MAP[aspectRatio] ?? '1024x1024';
    const defaults = loadDefaults();
    const prompt = buildPrompt(productName, monthlyPrice, atmosphere, defaults, revisionRequest, variationIndex, totalCount);

    const saveMeta = { productName, monthlyPrice, atmosphere, aspectRatio };

    // 修正モード
    if (previousImageB64 && revisionRequest) {
      const buf = Buffer.from(previousImageB64, 'base64');
      const imageFile = new File([buf], 'previous.png', { type: 'image/png' });

      const res = await getOpenAI().images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt,
        size: '1024x1024',
      });

      const imageB64 = res.data?.[0]?.b64_json;
      if (imageB64) await appendHistory(imageB64, saveMeta);
      return NextResponse.json({ imageB64 });
    }

    // 商品画像あり（メモリ上のbase64 — 背景透過後など）
    if (productImageB64) {
      const buf = Buffer.from(productImageB64, 'base64');
      const imageFile = new File([buf], 'product.png', { type: 'image/png' });

      const res = await getOpenAI().images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt,
        size: '1024x1024',
      });

      const imageB64 = res.data?.[0]?.b64_json;
      if (imageB64) await appendHistory(imageB64, saveMeta);
      return NextResponse.json({ imageB64 });
    }

    // 商品画像あり（pictransparentフォルダから）
    if (productFilename) {
      const imagePath = path.join(process.cwd(), 'pictransparent', path.basename(productFilename));
      const buf = fs.readFileSync(imagePath);
      const imageFile = new File([buf], 'product.png', { type: 'image/png' });

      const res = await getOpenAI().images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt,
        size: '1024x1024',
      });

      const imageB64 = res.data?.[0]?.b64_json;
      if (imageB64) await appendHistory(imageB64, saveMeta);
      return NextResponse.json({ imageB64 });
    }

    // テキストのみで生成
    const res = await getOpenAI().images.generate({
      model: 'gpt-image-2',
      prompt,
      size,
    });

    const imageB64 = res.data?.[0]?.b64_json;
    if (imageB64) await appendHistory(imageB64, saveMeta);
    return NextResponse.json({ imageB64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

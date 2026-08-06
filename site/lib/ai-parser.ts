/**
 * Reading trades off a recommendation screenshot, with Gemini vision.
 *
 * MIRROR OF lib/features/ai_parser/services/ai_trade_parser_service.dart — same
 * prompt, same generation config, same response handling and the same Arabic
 * error strings. Every branch below exists because the Dart original hit it
 * against real Gemini payloads; a fresh implementation would have to rediscover
 * all of them.
 *
 * THE CALL GOES STRAIGHT FROM THE BROWSER TO GOOGLE, with the user's own key.
 * Not through a route of ours, on purpose: proxying would put every user's
 * third-party credential through our server, which is a secret to hold and a
 * breach to own, in exchange for nothing — the key is already the user's, in
 * the user's browser, exactly as it is on their phone.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** The vision-capable model. Kept identical to GeminiConfig.model. */
export const GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * Images are capped so one pick cannot assemble a request big enough to be
 * rejected outright — every image is base64'd into the body.
 */
export const MAX_IMAGES = 10;

/** Carries an Arabic, user-facing message; the sheet shows it verbatim. */
export class AiParseError extends Error {}

export type AiTradeData = {
  ticker: string;
  direction: 'buy' | 'sell';
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  notes: string;
};

export function isValidAiTrade(t: AiTradeData): boolean {
  return t.ticker !== '' && (t.entryPrice !== null || t.stopLoss !== null);
}

const PROMPT = `حلل صور توصيات أسهم من البورصة المصرية واستخرج كل الصفقات اللي فيها.
الصور ممكن تكون أكتر من صورة، وكل صورة ممكن تحتوي أكتر من صفقة.
أعِد JSON فقط بالشكل ده بالظبط:
{
  "trades": [
    {
      "ticker": "كود السهم بالإنجليزي (مثل COMI) أو فارغ لو مش واضح",
      "direction": "buy أو sell",
      "entryPrice": رقم سعر الدخول أو null,
      "stopLoss": رقم وقف الخسارة أو null,
      "takeProfit": رقم الهدف أو null,
      "notes": "كلمة أو كلمتين بالعربي بس، أو فارغ"
    }
  ]
}

الصور بتيجي بأشكال مختلفة، اتعامل مع أي شكل منهم:
- جدول جلسة فيه صفوف كتير: كل صف فيه سهم = صفقة منفصلة، واستخرج كل الصفوف من
  غير ما تسيب ولا واحد مهما طال الجدول. أسماء الأعمدة بتختلف: الدخول ممكن
  يتكتب Buy Price Guide أو سعر الشراء، والهدف Target، والاستوب Stop loss أو S.L.
- رسالة أو منشور مكتوب من واتساب أو تليجرام: استخرج الأسعار من النص نفسه،
  وممكن الرسالة الواحدة يكون فيها أكتر من توصية.
- صورة شارت مرسوم عليها مستويات: خد الأرقام المكتوبة على الصورة.
- كارت توصية لسهم واحد: صفقة واحدة.

قواعد عامة لكل الأشكال:
- تجاهل مؤشرات السوق (EGX30، EGX70، EGX100) — دي مؤشرات مش أسهم، وأرقامها
  (R1، R2، S1، S2) دعوم ومقاومات مش دخول وهدف.
- تجاهل النِّسَب المحسوبة (Risk%، Profit%، نسبة الربح) — دي مش أسعار.
- كل سهم مختلف = عنصر منفصل، ومتدمجش صفقتين مع بعض.
- خلي notes قصيرة جدًا عشان الرد ميطولش.
- لو مفيش غير صفقة واحدة، رجّع قايمة فيها عنصر واحد.
متردّش أي نص خارج الـ JSON.`;

export type ImagePart = { mimeType: string; base64: string };

/**
 * Sends every image in ONE request rather than one each: a single round trip
 * instead of N, and the model sees them together, so a recommendation split
 * across two screenshots still reads as one trade.
 */
export async function parseTradeImages(
  images: ImagePart[],
  apiKey: string
): Promise<AiTradeData[]> {
  if (apiKey.trim() === '') {
    throw new AiParseError(
      'التحليل بالذكاء الاصطناعي مش متظبط. ضيف مفتاح Gemini في الإعدادات عشان تشغّله.'
    );
  }
  if (images.length === 0) {
    throw new AiParseError('اختار صورة واحدة على الأقل.');
  }
  if (images.length > MAX_IMAGES) {
    throw new AiParseError(
      `أقصى عدد صور في المرة الواحدة ${MAX_IMAGES}. جرّب على دفعات.`
    );
  }

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: PROMPT },
          ...images.map((image) => ({
            inline_data: { mime_type: image.mimeType, data: image.base64 },
          })),
        ],
      },
    ],
    // Force a JSON reply and kill creativity — this is extraction, not prose.
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
      // Reading a few numbers off an image needs no deliberation, and on
      // Gemini 3 reasoning shares the output budget — left unbounded it can hit
      // MAX_TOKENS before any answer is produced.
      thinkingConfig: { thinkingLevel: 'low' },
      // Generous and FLAT, not scaled per image: the cost is per TRADE, not per
      // picture. One screenshot of a broker's session table holds twenty rows
      // at roughly 120 tokens each, so a per-image budget cut the reply off
      // mid-JSON and failed the whole batch. Unused output tokens cost nothing;
      // a truncated answer costs the entire extraction.
      maxOutputTokens: 8192,
    },
  });

  let response: Response;
  try {
    response = await fetch(
      `${ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        // Several images take longer to upload and to read than one.
        signal: AbortSignal.timeout((30 + 15 * images.length) * 1000),
      }
    );
  } catch {
    throw new AiParseError('تعذّر الاتصال بخدمة التحليل. جرّب تاني.');
  }

  if (response.status === 400 || response.status === 403) {
    throw new AiParseError('مفتاح Gemini غير صالح أو مرفوض. راجع الإعدادات.');
  }
  if (!response.ok) {
    throw new AiParseError(`تعذّر التحليل (خطأ ${response.status}).`);
  }

  return parseResponse(await response.text());
}

/**
 * Parses a raw API body. Exported so the response handling can be verified
 * against real Gemini payload shapes without a key or a network.
 *
 * NO BLANKET TRY/CATCH. The Dart original had one and it turned every distinct
 * failure — a truncated reply, an unexpected field type, a refusal — into the
 * same "رد التحليل مش مفهوم", which is what made this impossible to diagnose.
 * Each step fails with its own reason.
 */
export function parseResponse(responseBody: string): AiTradeData[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(responseBody);
  } catch {
    throw new AiParseError('رد الخدمة مش JSON صالح. جرّب تاني.');
  }
  if (typeof decoded !== 'object' || decoded === null) {
    throw new AiParseError('رد الخدمة جه بشكل غير متوقع. جرّب تاني.');
  }
  const bodyMap = decoded as Record<string, unknown>;

  // The API reports refusals and quota problems in a 200 body.
  const error = bodyMap.error;
  if (typeof error === 'object' && error !== null) {
    const message = (error as Record<string, unknown>).message;
    throw new AiParseError(
      `الخدمة رفضت الطلب: ${typeof message === 'string' ? message : 'سبب غير معروف'}`
    );
  }

  const candidates = bodyMap.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    // A blocked image never produces a candidate, so without this the user is
    // told the picture was unclear when it was actually refused.
    const feedback = bodyMap.promptFeedback as Record<string, unknown> | undefined;
    const blocked = feedback?.blockReason;
    if (blocked != null) {
      throw new AiParseError(`الصورة اترفضت من الخدمة (${String(blocked)}).`);
    }
    throw new AiParseError('مقدرش يقرا الصورة. جرّب صورة أوضح.');
  }

  const candidate = candidates[0];
  if (typeof candidate !== 'object' || candidate === null) {
    throw new AiParseError('رد الخدمة جه بشكل غير متوقع. جرّب تاني.');
  }
  const finishReason = (candidate as Record<string, unknown>).finishReason;
  const content = (candidate as Record<string, unknown>).content as
    | Record<string, unknown>
    | undefined;
  const parts = content?.parts;

  /*
   * Every non-thought text part, JOINED — not just the first.
   *
   * Two traps live here. Gemini 3 emits reasoning parts beside the answer, each
   * flagged `thought: true`, so the answer is not necessarily part zero. And
   * the answer itself can be split across several text parts, so taking only
   * the first returned JSON cut off mid-object.
   */
  const text = (Array.isArray(parts) ? parts : [])
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .filter((p) => p.thought !== true)
    .map((p) => p.text)
    .filter((t): t is string => typeof t === 'string')
    .join('');

  if (text.trim() === '') throw new AiParseError(emptyReason(finishReason));

  const objects = decodeTrades(text);
  if (objects === null) {
    // Truncated mid-JSON: there IS text, so the empty-reply branch never sees
    // it, and without this the user gets "unclear" for a length problem.
    if (finishReason === 'MAX_TOKENS') {
      throw new AiParseError('التحليل طال أوي وماخلصش. جرّب صور أوضح أو أقل.');
    }
    throw new AiParseError('رد التحليل مش مفهوم. جرّب تاني.');
  }

  // Unusable entries are dropped rather than failing the batch: one blurry
  // recommendation among six should not cost the other five.
  const results = objects.map(toTradeData).filter(isValidAiTrade);

  if (results.length === 0) {
    if (finishReason === 'MAX_TOKENS') {
      throw new AiParseError('التحليل طال أوي وماخلصش. جرّب صور أوضح أو أقل.');
    }
    throw new AiParseError(
      'مقدرش يطلّع بيانات كافية من الصور. جرّب صور أوضح أو دخّلها يدوي.'
    );
  }
  return results;
}

/** Why a candidate came back with no usable text. */
function emptyReason(finishReason: unknown): string {
  switch (finishReason) {
    // Reasoning ate the output budget before any answer was produced.
    case 'MAX_TOKENS':
      return 'التحليل طال أوي وماخلصش. جرّب صورة أوضح أو أصغر.';
    case 'SAFETY':
    case 'PROHIBITED_CONTENT':
      return 'الخدمة رفضت تحلل الصورة دي. جرّب صورة تانية.';
    case 'RECITATION':
      return 'الخدمة رفضت الرد على الصورة دي. جرّب صورة تانية.';
    default:
      return 'التحليل رجع فاضي. جرّب تاني.';
  }
}

/**
 * The trade objects inside a model reply, or null if there are none.
 *
 * `responseMimeType: application/json` normally guarantees clean JSON, but a
 * model that falls back to plain text wraps it in a fence or buries it in a
 * sentence, and neither is worth failing the whole parse over.
 */
export function decodeTrades(raw: string): Record<string, unknown>[] | null {
  const text = stripFences(raw);

  const direct = tryDecodeTrades(text);
  if (direct !== null) return direct;

  // Prose around the JSON: take the outermost bracket pair and retry. The array
  // is tried first so a `{"trades": [...]}` wrapper is not mistaken for the
  // trade itself.
  for (const [open, close] of [
    ['[', ']'],
    ['{', '}'],
  ] as const) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start !== -1 && end > start) {
      const found = tryDecodeTrades(text.slice(start, end + 1));
      if (found !== null) return found;
    }
  }
  return null;
}

function tryDecodeTrades(source: string): Record<string, unknown>[] | null {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return null;
  }

  if (Array.isArray(value)) return objectsIn(value);
  if (typeof value !== 'object' || value === null) return null;

  // The requested wrapper. Other plausible key names are accepted too — the
  // model occasionally renames it despite the prompt.
  for (const key of ['trades', 'صفقات', 'results', 'data', 'items']) {
    const list = (value as Record<string, unknown>)[key];
    if (Array.isArray(list)) {
      const objects = objectsIn(list);
      if (objects !== null) return objects;
    }
  }

  // A lone object is one trade.
  return [value as Record<string, unknown>];
}

function objectsIn(list: unknown[]): Record<string, unknown>[] | null {
  const objects = list.filter(
    (e): e is Record<string, unknown> => typeof e === 'object' && e !== null && !Array.isArray(e)
  );
  return objects.length === 0 ? null : objects;
}

/** Unwraps a ```json fence. */
function stripFences(raw: string): string {
  let text = raw.trim();
  if (!text.startsWith('```')) return text;
  text = text.replace(/^```[a-zA-Z]*\s*/, '');
  const closing = text.lastIndexOf('```');
  if (closing !== -1) text = text.slice(0, closing);
  return text.trim();
}

function toTradeData(data: Record<string, unknown>): AiTradeData {
  return {
    ticker: toText(data.ticker).trim().toUpperCase(),
    direction:
      toText(data.direction).trim().toLowerCase() === 'sell' ? 'sell' : 'buy',
    entryPrice: toNumber(data.entryPrice),
    stopLoss: toNumber(data.stopLoss),
    takeProfit: toNumber(data.takeProfit),
    notes: toText(data.notes).trim(),
  };
}

const toText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** The model sometimes returns a price as a string. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

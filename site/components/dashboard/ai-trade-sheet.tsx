'use client';

import { useEffect, useState } from 'react';

import { SparkIcon, XIcon } from '@/components/icons';
import {
  AiParseError,
  MAX_IMAGES,
  parseTradeImages,
  type AiTradeData,
  type ImagePart,
} from '@/lib/ai-parser';
import { money, quantity as formatQuantity } from '@/lib/format';
import { readGeminiKey } from '@/lib/gemini-key';
import { computeSizing } from '@/lib/sizing';
import { newTradeId, type Trade } from '@/lib/trade';

/**
 * «تحليل توصيات بالـ AI» — the web counterpart of
 * lib/features/ai_parser/widgets/ai_trade_sheet.dart.
 *
 * Pick screenshots of recommendations, read the trades out of them, tick the
 * ones worth keeping, and save those as PLANS.
 *
 * NOTHING HERE IS A RECOMMENDATION FROM US. It reads a picture the user already
 * had and turns it into rows they can check — the source is whoever sent them
 * the screenshot, and the saved trade records that in `reason`. This is why
 * everything lands as `planned` and never as a position: the app's own rule,
 * and the line between "you were sent this" and "you took this".
 */

/** Base64 without the `data:...;base64,` prefix, which the API does not want. */
async function toImagePart(file: File): Promise<ImagePart | null> {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength === 0) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked: String.fromCharCode(...bytes) blows the argument limit on a
  // multi-megabyte screenshot and throws a RangeError instead of encoding.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return {
    mimeType: file.type === '' ? 'image/jpeg' : file.type,
    base64: btoa(binary),
  };
}

export function AiTradeSheet({
  capital,
  maxRiskPercent,
  onClose,
  onSave,
}: {
  capital: number;
  maxRiskPercent: number;
  onClose: () => void;
  /** Saves the chosen trades. Returns how many landed. */
  onSave: (trades: Trade[]) => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<AiTradeData[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Read once on mount: localStorage is not available during the server render.
  useEffect(() => setApiKey(readGeminiKey()), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  async function analyse() {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setExtracted(null);
    try {
      const parts = (await Promise.all(files.map(toImagePart))).filter(
        (p): p is ImagePart => p !== null
      );
      if (parts.length === 0) {
        setError('الصور فاضية أو مش مقروءة.');
        return;
      }
      const trades = await parseTradeImages(parts, apiKey);
      setExtracted(trades);
      // Everything ticked to start with — the common case is keeping the batch.
      setSelected(new Set(trades.map((_, i) => i)));
    } catch (e) {
      setError(
        e instanceof AiParseError ? e.message : 'حصل خطأ مش متوقع. جرّب تاني.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected() {
    if (extracted === null || selected.size === 0 || saving) return;
    setSaving(true);
    try {
      const chosen = [...selected].sort((a, b) => a - b).map((i) => extracted[i]);
      const trades: Trade[] = chosen.map((data) => {
        // Sized by the same risk rule the rest of the product uses, so an
        // imported idea is never a position the trader would have been warned
        // about.
        const sizing = computeSizing({
          capital,
          maxRiskPercent,
          entry: data.entryPrice,
          stop: data.stopLoss,
        });
        return {
          id: newTradeId(),
          entryDate: new Date(),
          ticker: data.ticker,
          reason: data.notes === '' ? 'توصية من صورة' : data.notes,
          entryPrice: data.entryPrice ?? 0,
          stopPrice: data.stopLoss ?? 0,
          quantity: sizing.suggestedQty ?? 0,
          exitPrice: null,
          exitDate: null,
          notes: null,
          // Imported, not taken: nothing here says the trader actually bought.
          status: 'planned',
          tags: [],
          isFavorite: false,
          completedChecklistItems: [],
          source: null,
          takeProfitPrice: data.takeProfit,
          timeline: [],
          screenshotPaths: [],
        };
      });
      await onSave(trades);
    } finally {
      setSaving(false);
    }
  }

  const hasKey = apiKey.trim() !== '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-sheet-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border-default bg-surface p-4 shadow-2xl sm:rounded-2xl sm:p-5"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-brand/25 text-brand-ink">
            <SparkIcon className="size-4" />
          </span>
          <h2 id="ai-sheet-title" className="flex-1 truncate text-lg font-bold">
            تحليل توصيات بالـ AI
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {!hasKey ? (
          <p className="mt-4 rounded-md border border-border-default bg-surface-low p-4 text-sm leading-relaxed text-fg-muted">
            محتاج مفتاح Gemini الأول. اعمل واحد مجانًا من{' '}
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-ink underline-offset-4 hover:underline"
            >
              Google AI Studio
            </a>{' '}
            وحطّه في <strong>الإعدادات</strong>. بيتخزّن على المتصفح ده بس، ومش
            بيتبعت لأي حد غير Google.
          </p>
        ) : (
          <>
            <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
              اختار صور التوصيات اللي وصلتك — جدول جلسة، رسالة واتساب، شارت
              مكتوب عليه مستويات. بيتقروا كلهم مرة واحدة، وأقصى حد{' '}
              <span className="num">{MAX_IMAGES}</span> صور.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                setFiles([...(e.target.files ?? [])].slice(0, MAX_IMAGES));
                setExtracted(null);
                setError(null);
              }}
              className="mt-3 w-full rounded-md border border-border-default bg-surface-low p-3 text-sm file:me-3 file:rounded-md file:border-0 file:bg-surface-high file:px-3 file:py-1.5 file:text-sm file:font-semibold"
            />

            <button
              type="button"
              onClick={() => void analyse()}
              disabled={files.length === 0 || busy}
              className="mt-3 w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? 'بيقرا الصور…'
                : `حلّل ${files.length > 0 ? `(${files.length})` : ''}`}
            </button>
          </>
        )}

        {error !== null && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-loss-border bg-loss-surface px-3 py-2 text-sm font-semibold text-loss"
          >
            {error}
          </p>
        )}

        {extracted !== null && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                طلع منها
                <span className="num font-normal text-fg-subtle">
                  {extracted.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selected.size === extracted.length
                      ? new Set()
                      : new Set(extracted.map((_, i) => i))
                  )
                }
                className="text-xs font-semibold text-brand-ink underline-offset-4 hover:underline"
              >
                {selected.size === extracted.length ? 'شيل الكل' : 'اختار الكل'}
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {extracted.map((data, i) => {
                const sizing = computeSizing({
                  capital,
                  maxRiskPercent,
                  entry: data.entryPrice,
                  stop: data.stopLoss,
                });
                return (
                  <li key={`${data.ticker}-${i}`}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border-default bg-surface-low p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => {
                          const next = new Set(selected);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          setSelected(next);
                        }}
                        className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="num font-bold">{data.ticker}</span>
                          {data.direction === 'sell' && (
                            <span className="rounded-full border border-loss-border bg-loss-surface px-2 py-0.5 text-[11px] font-bold text-loss">
                              بيع
                            </span>
                          )}
                          {data.notes !== '' && (
                            <span className="truncate text-xs text-fg-muted">
                              {data.notes}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-fg-muted">
                          دخول{' '}
                          <span className="num">{money(data.entryPrice)}</span> ·
                          استوب{' '}
                          <span className="num">{money(data.stopLoss)}</span> ·
                          هدف{' '}
                          <span className="num">{money(data.takeProfit)}</span>
                        </p>
                        <p className="mt-1 text-xs text-fg-subtle">
                          الكمية المقترحة{' '}
                          <span className="num">
                            {formatQuantity(sizing.suggestedQty)}
                          </span>
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => void saveSelected()}
              disabled={selected.size === 0 || saving}
              className="mt-4 w-full rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'بيتحفظ…' : `احفظها كأفكار مخططة (${selected.size})`}
            </button>

            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
              بتتحفظ <strong>مخططة</strong>، مش مفتوحة — دي توصية وصلتك من حد،
              مش صفقة عملتها. راجع الأرقام قبل ما تنفّذ أي حاجة؛ رادار بيقرا
              الصورة وبس، <strong>مش بيرشّح ولا بيقيّم</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

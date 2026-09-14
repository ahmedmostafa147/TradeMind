'use client';

/**
 * The notifications switch, in «الإعدادات».
 *
 * ── IT SAYS WHAT IT WILL SEND BEFORE THE BROWSER ASKS ───────────────────────
 *
 * A permission denial is permanent for an origin — there is no API to ask
 * again, and the reader has to dig through browser settings to undo it. So the
 * three things Radar will actually push are listed ON THIS PANEL, and the
 * browser's own dialog only appears after a click that follows them. A page
 * that prompts first and explains afterwards is trading a permanent no for one
 * saved paragraph.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  disablePush,
  enablePush,
  isPushEnabled,
  pushSupport,
  startTelegramLink,
  telegramState,
  TELEGRAM_BOT,
  unlinkTelegram,
  type PushSupport,
  type TelegramLink,
} from '@/lib/push';

/** Exactly what the worker can send. Kept in step with radar_alerts/rules.py. */
const WHAT_IT_SENDS = [
  'سهم في قايمة مراقبتك وصل السعر اللي انت حاططه',
  'مركز مفتوح آخر إغلاق ليه نزل تحت الاستوب اللي انت حاططه',
  'الأجانب قلبوا اتجاههم في السوق بعد جلسات متتالية في العكس',
];

export function NotificationsPanel({ uid }: { uid: string }) {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Read on mount, never during render: `Notification.permission` and the
  // service worker registration do not exist while Next prerenders this in
  // Node, and touching either there throws the whole page.
  useEffect(() => {
    let cancelled = false;
    setSupport(pushSupport());
    void isPushEnabled().then((on) => {
      if (!cancelled) setEnabled(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush(uid);
        setEnabled(false);
      } else {
        const result = await enablePush(uid);
        setSupport(result);
        setEnabled(result === 'ready');
      }
    } catch {
      // A failed subscribe leaves the switch where it was rather than claiming
      // a state the browser is not in. The reason lands in the console; there is
      // nothing the reader can do with a PushManager error string.
      setEnabled(await isPushEnabled());
    } finally {
      setBusy(false);
    }
  }, [enabled, uid]);

  if (support === null) return null;

  return (
    <section className="rounded-lg border border-border-default bg-surface p-4 sm:p-5">
      <h3 className="font-bold">تنبيهات المتصفح</h3>
      <p className="mt-1 text-sm text-fg-muted">
        رادار يقدر يبعتلك تنبيه وانت قافل الصفحة، في تلات حالات بس:
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
        {WHAT_IT_SENDS.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-fg-subtle">
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {support === 'ready' ? (
        <>
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={busy}
            className={`mt-4 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
              enabled
                ? 'border border-border-strong hover:bg-surface-high'
                : 'bg-brand text-on-brand'
            }`}
          >
            {busy ? '…' : enabled ? 'قفل التنبيهات' : 'فعّل التنبيهات'}
          </button>
          <p className="mt-2.5 text-xs text-fg-subtle">
            {enabled
              ? 'شغّالة على المتصفح ده. تقدر تقفلها من هنا في أي وقت.'
              : 'المتصفح هيسألك تسمح — ولازم تقبل عشان تشتغل.'}
          </p>
        </>
      ) : (
        <p className="mt-4 text-xs text-fg-subtle">{explain(support)}</p>
      )}

      <TelegramBlock uid={uid} />

      <p className="mt-3 border-t border-border-default pt-3 text-xs text-fg-subtle">
        التنبيهات دي مش نصائح استثمارية. رادار بيقولك إن رقم انت اللي حاططه
        اتلمس، والقرار قرارك.{' '}
        <a href="/privacy/" className="underline hover:text-fg">
          إزاي بنعمل ده
        </a>
      </p>
    </section>
  );
}

/**
 * Telegram, as a second channel beside the browser.
 *
 * ── WHY IT IS WORTH HAVING BESIDE WEB PUSH ──────────────────────────────────
 *
 * Browser notifications need a permission that can be refused permanently, a
 * service worker, and — on iPhone — the site installed to the home screen
 * first. Telegram needs a tap. For a product whose Android app is not
 * published, this is the shorter path to somebody actually being told.
 *
 * ── THE LINK TAKES EFFECT ON THE NEXT RUN, AND THE PANEL SAYS SO ────────────
 *
 * There is no server listening to the bot: the same scheduled job that decides
 * the alerts also drains Telegram's queue (see worker/radar_alerts/telegram.py
 * for why a webhook was not worth a public endpoint and a shared secret). So
 * pressing Start does not flip anything on screen immediately, and telling the
 * reader that is better than leaving them refreshing.
 */
function TelegramBlock({ uid }: { uid: string }) {
  const [link, setLink] = useState<TelegramLink | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void telegramState(uid).then((state) => {
      if (!cancelled) setLink(state);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (TELEGRAM_BOT === '' || link === null) return null;

  async function issue() {
    setBusy(true);
    try {
      setLink({ state: 'pending', url: await startTelegramLink(uid) });
    } catch {
      setLink(await telegramState(uid));
    } finally {
      setBusy(false);
    }
  }

  async function drop() {
    setBusy(true);
    try {
      await unlinkTelegram(uid);
      setLink({ state: 'off' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border-default pt-4">
      <p className="text-sm font-bold">أو على تيليجرام</p>

      {link.state === 'linked' ? (
        <>
          <p className="mt-1 text-xs text-fg-muted">
            متوصّل. التنبيهات بتوصلك على تيليجرام.
          </p>
          <button
            type="button"
            onClick={() => void drop()}
            disabled={busy}
            className="mt-3 rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high disabled:opacity-40"
          >
            {busy ? '…' : 'افصل تيليجرام'}
          </button>
        </>
      ) : link.state === 'pending' ? (
        <>
          <p className="mt-1 text-xs text-fg-muted">
            افتح الرابط واضغط <strong>Start</strong>. الربط بيتم مع أول تشغيل
            للتنبيهات بعدها — مش لحظة الضغط.
          </p>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand"
          >
            افتح البوت
          </a>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-fg-muted">
            من غير إذن متصفح ومن غير تثبيت — بيوصلك على تليفونك على طول.
          </p>
          <button
            type="button"
            onClick={() => void issue()}
            disabled={busy}
            className="mt-3 rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high disabled:opacity-40"
          >
            {busy ? '…' : 'اربط تيليجرام'}
          </button>
        </>
      )}
    </div>
  );
}

/** Every non-ready state, said as the thing the reader can do about it. */
function explain(support: PushSupport): string {
  switch (support) {
    case 'needs-install':
      // Apple gates the Push API on the PWA being installed. Saying "your
      // browser cannot" would be false AND would hide the one action that works.
      return 'على الآيفون، التنبيهات بتشتغل بعد ما تضيف رادار للشاشة الرئيسية: من زرار المشاركة في Safari اختار «أضف إلى الشاشة الرئيسية»، وافتحه من هناك.';
    case 'denied':
      return 'انت منعت التنبيهات للموقع ده قبل كده، والمتصفح مش بيسمح لنا نسأل تاني. لو غيّرت رأيك، غيّرها من إعدادات الموقع في المتصفح.';
    case 'not-configured':
      return 'التنبيهات لسه مش متظبّطة على النسخة دي.';
    default:
      return 'المتصفح ده مبيدعمش تنبيهات الويب.';
  }
}

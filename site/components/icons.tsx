/**
 * The site's icon set — stroke SVGs on a 24×24 grid, 1.7px weight.
 *
 * Hand-drawn rather than pulled from a library because the page needs twelve
 * of them and an icon dependency would ship several hundred unused ones. They
 * share a viewBox, a stroke weight and round caps, which is what makes a set
 * read as a set.
 *
 * No emoji anywhere on this site. An emoji renders as a different picture on
 * every platform, cannot inherit `currentColor`, and reads as decoration in a
 * product whose whole argument is discipline.
 */

type IconProps = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const cls = (className?: string) => className ?? 'size-5';

export function CalculatorIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h4M8 19h.01M12 19h.01" />
    </svg>
  );
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M4 6.5 5.5 8 8 5M4 12.5 5.5 14 8 11M4 18.5 5.5 20 8 17" />
      <path d="M11 6.5h9M11 12.5h9M11 18.5h9" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <path d="M12 18 16 11" />
      <circle cx="12" cy="18" r="1.4" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3.5 20h17" />
      <path d="m4 15 4.5-5 3.5 3.5L20 5" />
      <path d="M20 9V5h-4" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7Z" />
      <circle cx="8" cy="8" r="1.3" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14.5h3" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.8 21.5 19.5 19.2 20.2 18.5 22.5 17.8 20.2 15.5 19.5 17.8 18.8 18.5 16.5Z" />
    </svg>
  );
}

export function CloudIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M7 18.5a4.2 4.2 0 0 1-.4-8.4 5.6 5.6 0 0 1 10.8-1.2A3.9 3.9 0 0 1 17.5 18.5Z" />
      <path d="M12 12v5M9.8 14.7 12 12.2l2.2 2.5" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.8" cy="9.8" r="1.4" />
      <path d="m4 17 4.6-4.4a1.6 1.6 0 0 1 2.2 0L15 17" />
      <path d="m14 15 1.6-1.5a1.6 1.6 0 0 1 2.2 0L20 15.5" />
    </svg>
  );
}

export function TimelineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M6 3.5v17" />
      <circle cx="6" cy="8" r="2" />
      <circle cx="6" cy="16" r="2" />
      <path d="M10.5 8H20M10.5 16H17" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9.3 4.4-1.1 7.5-4.9 7.5-9.3V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function OfflineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
      <path d="M9 9.5h6M9 12.5h4" />
    </svg>
  );
}

export function BanIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={cls(className)}>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={cls(className)}>
      <path d="m4 12.5 5 5 11-11" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 7.4 5.3a2 2 0 0 0 2.2 0L20.5 7" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/**
 * The struck-through eye, for "password is visible — click to hide".
 *
 * A separate icon rather than EyeIcon plus a CSS line: the slash has to sit at
 * the same angle and weight as the rest of the set, and a border-based strike
 * would not scale with the stroke width.
 */
export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c5 0 9 4.4 9 7 0 .9-.5 2-1.4 3.1M6.5 6.9C3.9 8.5 3 10.6 3 12c0 2.6 4 7 9 7 1.8 0 3.4-.6 4.7-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  );
}

/** The counterpart to CheckIcon — same 2.4 weight so a pair reads as a pair. */
export function XIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={cls(className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/**
 * The four bottom-bar destinations and the add-trade action.
 *
 * Drawn to stand in for the app's Material icons one-for-one — receipt_long,
 * insights, calculate, settings, add — so the same slot carries the same
 * picture on both surfaces. ChartIcon above already covers `insights`.
 */
export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-2.3-1.5L14.4 21l-2.3-1.5L9.8 21l-2.3-1.5Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="12" r="3.1" />
      {/* A cogwheel, not a sun. The previous drawing was a circle with eight
          straight rays, which is the brightness glyph — next to a theme toggle
          it read as a second one. */}
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * The daily-decision section marks, mapping to the app's ActionSection icons —
 * warning_amber, hourglass_bottom, trending_up, lightbulb_outline,
 * check_circle_outline — plus a real gear.
 */
export function WarningIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20.2h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4.5M12 17h.01" />
    </svg>
  );
}

export function HourglassIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M6 2.5h12M6 21.5h12" />
      <path d="M7.5 2.5v3.6c0 1.2.5 2.3 1.4 3.1L12 12l-3.1 2.8c-.9.8-1.4 1.9-1.4 3.1v3.6" />
      <path d="M16.5 2.5v3.6c0 1.2-.5 2.3-1.4 3.1L12 12l3.1 2.8c.9.8 1.4 1.9 1.4 3.1v3.6" />
    </svg>
  );
}

export function TrendingUpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3 16.5 9 10.5l3.5 3.5L21 5.5" />
      <path d="M15.5 5.5H21v5.5" />
    </svg>
  );
}

export function LightbulbIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M9.5 18h5M10 21h4" />
      <path d="M12 2.5a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 1.9V18h5.4v-2.8c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 2.5Z" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="m8 12.3 2.7 2.7L16 9.7" />
    </svg>
  );
}

/* The goal planner's set. The presets shipped as emoji — 🎓 🚗 🌴 🏠 — which
   this file exists to keep off the page: they render as a different picture on
   every platform and cannot take `currentColor`, so a selected chip kept its
   colour while its label inverted. */

export function TargetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M20.5 11.5h-3.2a2.25 2.25 0 0 0 0 4.5h3.2" />
    </svg>
  );
}

export function GraduationIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
      <path d="M6.5 10.8v4.9c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4.9" />
      <path d="M21.5 8.5v5" />
    </svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M4 12.5 5.7 7.8A2 2 0 0 1 7.6 6.5h8.8a2 2 0 0 1 1.9 1.3L20 12.5" />
      <path d="M3 12.5h18v4.2a1 1 0 0 1-1 1h-1.5v-1.5h-11v1.5H4a1 1 0 0 1-1-1v-4.2Z" />
      <path d="M6.5 15h.01M17.5 15h.01" />
    </svg>
  );
}

export function PalmIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M12 8.5v12" />
      <path d="M12 8.5C9.6 6.9 6.6 7.3 5 9.4M12 8.5c2.4-1.6 5.4-1.2 7 .9" />
      <path d="M12 8.5C11 5.9 8.6 4.2 6 4.4M12 8.5c1-2.6 3.4-4.3 6-4.1" />
      <path d="M8.5 20.5h7" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.2v10.3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.2" />
      <path d="M9.8 20.5v-5.8h4.4v5.8" />
    </svg>
  );
}

/** A three-dot overflow, the app's PopupMenuButton. */
export function MoreIcon({ className }: IconProps) {
  return (
    <svg {...base} className={cls(className)}>
      <circle cx="12" cy="5" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="12" cy="19" r="1.3" />
    </svg>
  );
}

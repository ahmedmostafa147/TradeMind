import Image from 'next/image';
import Link from 'next/link';

import { DownloadButton } from '@/components/download-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { nav, site } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label={`${site.name} — الصفحة الرئيسية`}
        >
          {/* A 96px source for a mark that never renders above 32px CSS —
              enough for a 3x display, and 5KB against the 368KB original.
              alt="" because the adjacent wordmark already names the link. */}
          <Image
            src="/logo-96.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-md"
            priority
          />
          <span className="text-base font-bold tracking-tight">{site.name}</span>
        </Link>

        {/* Anchor links are hidden on small screens rather than folded into a
            hamburger: this is one scrolling page with four sections, so a menu
            would add a dialog, a focus trap and an overlay to replace a
            gesture the visitor already has. */}
        <nav aria-label="أقسام الصفحة" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-high hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="me-auto flex items-center gap-2">
          <ThemeToggle />
          <DownloadButton className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  nameForTicker,
  searchTickers,
  type DirectoryEntry,
} from '@/lib/egx-directory';

/**
 * Ticker input with EGX name resolution and suggestions.
 *
 * The counterpart of lib/features/market/widgets/ticker_field.dart. Typing
 * "بنك" or "COM" offers matching codes, and once a known code is entered its
 * Arabic name shows underneath — so a trade is never saved against a code the
 * trader only half-remembered. The site had a bare text box, which is why the
 * same act felt like two different products.
 *
 * The list only ever NAMES what the user is already typing. It does not rank,
 * score or pick — see the note on EGX_DIRECTORY.
 */

/** Enough to choose from without turning the form into a list screen. */
const MAX_SUGGESTIONS = 6;

export function TickerField({
  value,
  onChange,
  id,
  required = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-suggestions`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Set when a suggestion is taken, so the list does not immediately reopen on
  // the value it just wrote. Cleared by the next keystroke.
  const justPicked = useRef(false);

  /**
   * Catches focus that happened BEFORE React was listening.
   *
   * `autoFocus` renders as the plain HTML `autofocus` attribute in the server
   * markup, so the browser focuses this input while parsing — long before
   * hydration attaches `onFocus`. That event is never replayed, so the field
   * sat focused with `focused` stuck at false and typing produced no
   * suggestions at all. Reading activeElement once on mount is the only way to
   * learn about a focus that predates the handler.
   */
  useEffect(() => {
    if (document.activeElement === inputRef.current) setFocused(true);
  }, []);

  const trimmed = value.trim();
  const resolvedName = nameForTicker(trimmed);

  const suggestions: DirectoryEntry[] = useMemo(() => {
    if (trimmed === '') return [];
    // An exact hit is not a choice to make — the name below the field already
    // confirms it, and leaving the list up covers the next field.
    if (nameForTicker(trimmed) !== null) return [];
    return searchTickers(trimmed).slice(0, MAX_SUGGESTIONS);
  }, [trimmed]);

  const showList = focused && !justPicked.current && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          justPicked.current = false;
          onChange(e.target.value.toUpperCase());
        }}
        onFocus={() => setFocused(true)}
        // Delayed: a click on a suggestion blurs the input before the click
        // lands, and closing the list synchronously removes the element out
        // from under the pointer so the pick never fires.
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && showList) {
            e.stopPropagation();
            setFocused(false);
          }
        }}
        dir="ltr"
        className="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-start outline-none focus:border-brand-ink"
        placeholder="COMI"
      />

      {resolvedName !== null && (
        <p className="mt-1.5 text-xs text-fg-muted">{resolvedName}</p>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border-strong bg-surface py-1 shadow-lg"
        >
          {suggestions.map((entry) => (
            <li key={entry.code}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                // onMouseDown, not onClick: mousedown fires before the input's
                // blur, so the pick lands even without the delay above.
                onMouseDown={(e) => {
                  e.preventDefault();
                  justPicked.current = true;
                  onChange(entry.code);
                  setFocused(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm transition-colors hover:bg-surface-high"
              >
                <span className="num font-bold">{entry.code}</span>
                <span className="truncate text-xs text-fg-muted">
                  {entry.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

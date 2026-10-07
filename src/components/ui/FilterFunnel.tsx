'use client';

import type { ReactNode } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { cn } from '@/lib/cn';

/**
 * A list's dropdown filters folded behind a funnel, so the list starts right
 * under its search (the owner's choice for every page, 7 Oct 2026). The
 * button says how many filters are on; the filters themselves still live in
 * the address and apply as soon as they are chosen.
 */
export function FilterFunnel({
  on,
  onClear,
  children,
}: {
  /** How many filters are set, shown on the button. */
  on: number;
  /** Shown as "Clear the filters" once any is on. */
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={on ? `Filters, ${on} on` : 'Filters'}
        title="Filters"
        className={cn(
          'relative flex h-9 items-center gap-1.5 rounded-[7px] border px-2.5 text-[12.5px] font-medium',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          on
            ? 'border-accent-br bg-chip text-fg'
            : 'border-border text-fg2 hover:bg-hover hover:text-fg',
        )}
      >
        <svg
          viewBox="0 0 20 20"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 4h14l-5.5 6.5V16l-3 1.5v-7L3 4z" />
        </svg>
        {on > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-ink tabular-nums">
            {on}
          </span>
        )}
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'bottom end', gap: 6 }}
        className="z-30 w-72 max-w-[calc(100vw-2rem)] rounded-[10px] border border-border bg-surface p-3 shadow-xl"
      >
        <div className="flex flex-col gap-3">
          {children}
          {on > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="self-start text-[12px] text-accent underline"
            >
              Clear the filters
            </button>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

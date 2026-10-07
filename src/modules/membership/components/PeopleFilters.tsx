'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';

type Field = 'salvation' | 'baptism' | 'gender' | 'age' | 'lives' | 'source';

const FIELDS: Record<Field, { label: string; options: { value: string; label: string }[] }> = {
  salvation: {
    label: 'Salvation',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'saved', label: 'Saved' },
      { value: 'not', label: 'Not yet' },
    ],
  },
  baptism: {
    label: 'Baptism',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'baptised', label: 'Baptised' },
      { value: 'not', label: 'Not yet' },
    ],
  },
  gender: {
    label: 'Gender',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'Female', label: 'Female' },
      { value: 'Male', label: 'Male' },
    ],
  },
  age: {
    label: 'Age',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'Under 18', label: 'Under 18' },
      { value: '19–35', label: '19 – 35' },
      { value: '36–44', label: '36 – 44' },
      { value: '45+', label: '45 & above' },
    ],
  },
  lives: {
    label: 'Lives in',
    options: [
      { value: 'any', label: 'Anywhere' },
      { value: 'arusha', label: 'Arusha' },
      { value: 'region', label: 'Another region' },
      { value: 'country', label: 'Another country' },
    ],
  },
  source: {
    label: 'Heard via',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'A friend', label: 'A friend' },
      { value: 'Social media', label: 'Social media' },
      { value: 'Outreach', label: 'Outreach' },
      { value: 'Walked past', label: 'Walked past' },
      { value: 'Other', label: 'Another way' },
    ],
  },
};

/**
 * The search box, with every other filter folded behind a funnel so the list
 * starts right under it. The funnel says how many filters are on; everything
 * lives in the URL and applies as soon as it is chosen.
 */
export function PeopleFilters({
  path,
  fields = ['salvation', 'baptism', 'gender', 'age', 'lives', 'source'],
  tabs,
  defaultTab = 'all',
  counts = {},
  shown,
  total,
}: {
  /** The page these filters belong to. */
  path: string;
  fields?: Field[];
  /** Quick groups shown as chips under the search, with their counts. */
  tabs?: readonly (readonly [string, string])[];
  /** The tab shown when the address names none. */
  defaultTab?: string;
  counts?: Record<string, number>;
  shown: number;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useLiveSearch(path);

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== 'any') next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.replace(`${path}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  const value = (key: string) => params.get(key) ?? 'any';
  const tab = params.get('tab') ?? defaultTab;
  const on = fields.filter((f) => params.get(f)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Search"
            placeholder="Search name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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
            className="z-30 w-64 rounded-[10px] border border-border bg-surface p-3 shadow-xl"
          >
            <div className="flex flex-col gap-3">
              {fields.map((f) => (
                <Select
                  key={f}
                  label={FIELDS[f].label}
                  value={value(f)}
                  onChange={(e) => set({ [f]: e.target.value })}
                  options={FIELDS[f].options}
                />
              ))}
              {on > 0 && (
                <button
                  type="button"
                  onClick={() => set(Object.fromEntries(fields.map((f) => [f, ''])))}
                  className="self-start text-[12px] text-accent underline"
                >
                  Clear the filters
                </button>
              )}
            </div>
          </PopoverPanel>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs?.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => set({ tab: key === defaultTab ? '' : key })}
            aria-pressed={tab === key}
            className={cn(
              'rounded-full border px-3 py-1 text-[12px]',
              tab === key
                ? 'border-accent-br bg-chip text-fg'
                : 'border-border text-fg2 hover:bg-hover',
            )}
          >
            {label} <span className="text-fg3 tabular-nums">{counts[key] ?? 0}</span>
          </button>
        ))}
        <p className="ml-auto text-[11.5px] text-fg3">
          {shown} of {total.toLocaleString('en-GB')} shown · filtering live
        </p>
      </div>
    </div>
  );
}

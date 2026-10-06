'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const PATH = '/membership/prayers';

/** The last twelve months, newest first, as '2026-09'. */
function recentMonths(today = new Date()): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  });
}

/** A name, and a month. Both live in the URL, as every filter in the portal does. */
export function PrayerFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useLiveSearch(PATH);
  const month = params.get('month') ?? '';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <Input
          label="Search"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Select
        label="Month"
        value={month}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set('month', e.target.value);
          else next.delete('month');
          router.replace(`${PATH}${next.size ? `?${next}` : ''}`, { scroll: false });
        }}
        options={[{ value: '', label: 'Any month' }, ...recentMonths()]}
      />
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FilterFunnel } from '@/components/ui/FilterFunnel';

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

/**
 * A name, and a month behind the funnel. Both live in the URL, as every filter
 * in the portal does.
 */
export function PrayerFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useLiveSearch(PATH);
  const month = params.get('month') ?? '';
  const pick = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('month', value);
    else next.delete('month');
    router.replace(`${PATH}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Input
          label="Search"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <FilterFunnel on={month ? 1 : 0} onClear={() => pick('')}>
        <Select
          label="Month"
          value={month}
          onChange={(e) => pick(e.target.value)}
          options={[{ value: '', label: 'Any month' }, ...recentMonths()]}
        />
      </FilterFunnel>
    </div>
  );
}

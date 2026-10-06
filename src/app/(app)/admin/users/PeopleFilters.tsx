'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_KINDS, ACCOUNT_KIND_KEYS } from '@/shared';

/**
 * Filters live in the URL and apply as you type, as the owner asked for: no
 * Filter button to press, the Back button works, and a filtered list can be
 * sent to someone as a link.
 */
export function PeopleFilters({ total, shown }: { total: number; shown: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useLiveSearch('/admin/users');

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.replace(`/admin/users${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  const filtered = Boolean(params.get('q') || params.get('status') || params.get('kind'));

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <Input
          label="Search"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Select
        inline
        label="Status"
        value={params.get('status') ?? 'any'}
        onChange={(e) => set({ status: e.target.value === 'any' ? '' : e.target.value })}
        options={[
          { value: 'any', label: 'any' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INVITED', label: 'Invited' },
          { value: 'DISABLED', label: 'Disabled' },
        ]}
      />
      <Select
        inline
        label="Kind"
        value={params.get('kind') ?? 'any'}
        onChange={(e) => set({ kind: e.target.value === 'any' ? '' : e.target.value })}
        options={[
          { value: 'any', label: 'any' },
          ...ACCOUNT_KIND_KEYS.map((k) => ({ value: k, label: ACCOUNT_KINDS[k].label })),
        ]}
      />
      {filtered && (
        <Button variant="secondary" size="sm" onClick={() => router.replace('/admin/users')}>
          Clear
        </Button>
      )}
      <p className="ml-auto text-[11.5px] text-fg3">
        {shown} of {total} shown · filtering live
      </p>
    </div>
  );
}

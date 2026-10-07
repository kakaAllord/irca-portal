'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FilterFunnel } from '@/components/ui/FilterFunnel';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const SOURCES = [
  { value: '', label: 'Everywhere' },
  { value: 'API', label: 'The API' },
  { value: 'PORTAL_SERVER', label: 'Building a page' },
  { value: 'PORTAL_BROWSER', label: 'In the browser' },
];

/**
 * Where an error happened and on which day, behind the funnel. Both stay in
 * the address beside the reference being looked up, so the page can still be
 * pasted into a message.
 */
export function ErrorFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/dev/errors${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  return (
    <FilterFunnel
      on={['source', 'day'].filter((key) => params.get(key)).length}
      onClear={() => set({ source: '', day: '' })}
    >
      <Select
        label="Where"
        value={params.get('source') ?? ''}
        onChange={(e) => set({ source: e.target.value })}
        options={SOURCES}
      />
      <Input
        label="Day"
        type="date"
        value={params.get('day') ?? ''}
        onChange={(e) => set({ day: e.target.value })}
      />
    </FilterFunnel>
  );
}

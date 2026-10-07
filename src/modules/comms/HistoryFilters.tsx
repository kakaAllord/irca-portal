'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/Select';
import { FilterFunnel } from '@/components/ui/FilterFunnel';
import { MESSAGE_STATUS } from './types';

/** Department and status behind the funnel, in the address bar so a filtered list can be shared. */
export function HistoryFilters({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  function set(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== 'any') next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.replace(`/comms/history${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  return (
    <FilterFunnel
      on={['department', 'status'].filter((key) => params.get(key)).length}
      onClear={() => set({ department: '', status: '' })}
    >
      <Select
        label="Department"
        value={params.get('department') ?? 'any'}
        onChange={(e) => set({ department: e.target.value })}
        options={[
          { value: 'any', label: 'All' },
          { value: 'none', label: 'Communications' },
          ...departments.map((d) => ({ value: d.id, label: d.name })),
        ]}
      />
      <Select
        label="Status"
        value={params.get('status') ?? 'any'}
        onChange={(e) => set({ status: e.target.value })}
        options={[
          { value: 'any', label: 'All' },
          ...Object.entries(MESSAGE_STATUS).map(([value, s]) => ({ value, label: s.label })),
        ]}
      />
    </FilterFunnel>
  );
}

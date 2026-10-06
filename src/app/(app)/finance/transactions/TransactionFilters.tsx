'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

type Option = { id: string; name: string };

/** Filters live in the URL, so a filtered list can be sent to someone as a link. */
export function TransactionFilters({
  sources,
  items,
  accounts,
}: {
  sources: Option[];
  items: Option[];
  accounts: (Option & { method: string })[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useLiveSearch('/finance/transactions');

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.replace(`/finance/transactions${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  const kind = params.get('kind') ?? 'any';
  const filtered = [...params.keys()].some((key) => key !== 'page');

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <Input
          label="Search"
          placeholder="Search number, reference, payer or payee…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <Select
        inline
        label="Kind"
        value={kind}
        onChange={(e) => set({ kind: e.target.value === 'any' ? '' : e.target.value })}
        options={[
          { value: 'any', label: 'all' },
          { value: 'INCOME', label: 'Income' },
          { value: 'EXPENSE', label: 'Expenses' },
          { value: 'TRANSFER', label: 'Transfers' },
        ]}
      />
      <Select
        inline
        label="Source or item"
        value={params.get('incomeSourceId') ?? params.get('expenseItemId') ?? 'any'}
        onChange={(e) => {
          const id = e.target.value === 'any' ? '' : e.target.value;
          const isSource = sources.some((s) => s.id === id);
          set({ incomeSourceId: isSource ? id : '', expenseItemId: isSource ? '' : id });
        }}
        options={[
          { value: 'any', label: 'any' },
          ...sources.map((s) => ({ value: s.id, label: `Income: ${s.name}` })),
          ...items.map((i) => ({ value: i.id, label: `Expense: ${i.name}` })),
        ]}
      />
      {accounts.length > 0 && (
        <Select
          inline
          label="Account"
          className="max-w-[calc(100vw-2rem)]"
          value={params.get('accountId') ?? 'any'}
          onChange={(e) => set({ accountId: e.target.value === 'any' ? '' : e.target.value })}
          options={[
            { value: 'any', label: 'any' },
            ...accounts.map((a) => ({ value: a.id, label: `${a.method}: ${a.name}` })),
          ]}
        />
      )}
      <Input
        label="From"
        type="date"
        value={params.get('from') ?? ''}
        onChange={(e) => set({ from: e.target.value })}
      />
      <Input
        label="To"
        type="date"
        value={params.get('to') ?? ''}
        onChange={(e) => set({ to: e.target.value })}
      />
      <label className="flex h-9 items-center gap-1.5 text-[12px] text-fg2">
        <input
          type="checkbox"
          checked={params.get('status') === 'all'}
          onChange={(e) => set({ status: e.target.checked ? 'all' : '' })}
        />
        Show voided
      </label>
      {filtered && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.replace('/finance/transactions')}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

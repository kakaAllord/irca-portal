'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveSearch } from '@/lib/useLiveSearch';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FilterFunnel } from '@/components/ui/FilterFunnel';

type Option = { id: string; name: string };

/**
 * The kind and the search stay in sight; category, account, dates and voided
 * entries fold behind the funnel. Filters live in the URL, so a filtered list
 * can be sent to someone as a link.
 */
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
  const FOLDED = ['incomeSourceId', 'expenseItemId', 'accountId', 'from', 'to', 'status'];
  const on = new Set(
    FOLDED.filter((key) => params.get(key)).map((key) => (key === 'to' ? 'from' : key)),
  ).size;

  const KINDS = [
    ['any', 'All'],
    ['INCOME', 'Income'],
    ['EXPENSE', 'Expenses'],
    ['TRANSFER', 'Transfers'],
  ] as const;

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Kind"
          className="inline-flex rounded-full border border-border bg-surface2 p-0.5"
        >
          {KINDS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => set({ kind: value === 'any' ? '' : value })}
              className={
                kind === value
                  ? 'rounded-full bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-fg shadow-sm'
                  : 'rounded-full px-3.5 py-1.5 text-[12.5px] text-fg2 hover:text-fg'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            hideLabel
            placeholder="Search number, reference, payer or payee…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <FilterFunnel
          on={on}
          onClear={() => set(Object.fromEntries(FOLDED.map((key) => [key, ''])))}
        >
          <Select
            label="Category"
            value={params.get('incomeSourceId') ?? params.get('expenseItemId') ?? 'any'}
            onChange={(e) => {
              const id = e.target.value === 'any' ? '' : e.target.value;
              const isSource = sources.some((s) => s.id === id);
              set({ incomeSourceId: isSource ? id : '', expenseItemId: isSource ? '' : id });
            }}
            options={[
              { value: 'any', label: 'Any' },
              ...sources.map((s) => ({ value: s.id, label: `Income: ${s.name}` })),
              ...items.map((i) => ({ value: i.id, label: `Expense: ${i.name}` })),
            ]}
          />
          {accounts.length > 0 && (
            <Select
              label="Account"
              value={params.get('accountId') ?? 'any'}
              onChange={(e) => set({ accountId: e.target.value === 'any' ? '' : e.target.value })}
              options={[
                { value: 'any', label: 'Any' },
                ...accounts.map((a) => ({ value: a.id, label: `${a.method}: ${a.name}` })),
              ]}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-fg2">
            <input
              type="checkbox"
              checked={params.get('status') === 'all'}
              onChange={(e) => set({ status: e.target.checked ? 'all' : '' })}
            />
            Show voided
          </label>
        </FilterFunnel>
      </div>
    </div>
  );
}

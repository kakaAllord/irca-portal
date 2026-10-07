import type { Metadata } from 'next';
import Link from 'next/link';
import type { CatalogItem, MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { ItemActions, NewItemButton } from './ItemActions';

export const metadata: Metadata = { title: 'Categories' };

type Kind = 'income' | 'expense';

const KIND = {
  expense: {
    label: 'Expense items',
    says: 'What the church spends on',
    arrow: 'M8 3v10M4 9l4 4 4-4',
    tint: 'text-danger bg-danger-bg',
  },
  income: {
    label: 'Income sources',
    says: 'Where the church’s money comes from',
    arrow: 'M8 13V3M4 7l4-4 4 4',
    tint: 'text-pos bg-pos-bg',
  },
} as const;

/**
 * The categories every entry is recorded under: what the church spends on,
 * and where its money comes from. Add one here, or while recording.
 *
 * Nothing can be deleted. An item that has been used has to keep existing for
 * the old entries to mean anything; one that is finished with stops being
 * used, and is kept below the rest.
 */
export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.catalog.read')) return <ForbiddenState what="the finance categories" />;

  const params = await searchParams;
  const kind: Kind = params.tab === 'income' ? 'income' : 'expense';
  const [expense, income] = await Promise.all([
    serverApi<{ rows: CatalogItem[] }>('/finance/expense-items?status=all'),
    serverApi<{ rows: CatalogItem[] }>('/finance/income-sources?status=all'),
  ]);
  const all = { expense: expense.rows, income: income.rows };
  const rows = all[kind];
  const inUse = rows.filter((r) => r.isActive).sort((a, b) => b.uses - a.uses);
  const stopped = rows.filter((r) => !r.isActive);

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="The income sources and expense items every entry is recorded under. Add one here, or while recording."
        actions={<NewItemButton kind={kind} />}
      />

      <nav aria-label="Kind" className="mb-6 grid gap-3 sm:grid-cols-2">
        {(['expense', 'income'] as const).map((key) => {
          const look = KIND[key];
          const on = kind === key;
          const count = all[key].filter((r) => r.isActive).length;
          return (
            <Link
              key={key}
              href={`/finance/lists${key === 'income' ? '?tab=income' : ''}`}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-[16px] border p-4 transition-colors',
                on
                  ? 'border-accent-br bg-surface shadow-sm ring-1 ring-accent-br'
                  : 'border-border bg-surface2 hover:bg-hover',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-10 flex-none items-center justify-center rounded-full',
                  look.tint,
                )}
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
                  <path
                    d={look.arrow}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-fg">{look.label}</span>
                <span className="text-[12px] text-fg3">
                  {look.says} · {count} in use
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {inUse.length === 0 ? (
        <EmptyState title={`No ${KIND[kind].label.toLowerCase()} yet`}>
          Add the first with the button above, or while recording an entry.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {inUse.map((item) => (
            <ItemCard key={item.id} kind={kind} item={item} />
          ))}
        </ul>
      )}

      {stopped.length > 0 && (
        <details className="mt-8 rounded-[14px] border border-dashed border-border">
          <summary className="cursor-pointer px-4 py-3 text-[12.5px] text-fg2">
            No longer used ({stopped.length}): kept for the entries recorded under them
          </summary>
          <ul className="grid gap-3 p-4 pt-1 sm:grid-cols-2 xl:grid-cols-3">
            {stopped.map((item) => (
              <ItemCard key={item.id} kind={kind} item={item} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ItemCard({ kind, item }: { kind: Kind; item: CatalogItem }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4',
        !item.isActive && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/finance/transactions?${kind === 'income' ? 'incomeSourceId' : 'expenseItemId'}=${item.id}`}
              className="text-[13.5px] font-semibold text-fg hover:underline"
            >
              {item.name}
            </Link>
            {item.countsAsOffering && (
              <span className="rounded-full bg-chip px-2 py-0.5 text-[10.5px] font-medium text-fg2">
                Offering
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-[12px] text-fg3">
            {item.description || 'No description yet.'}
          </span>
        </span>
        <ItemActions kind={kind} item={item} />
      </div>
      <p className="mt-auto border-t border-border2 pt-2 text-[11.5px] text-fg2 tabular-nums">
        {item.uses === 0
          ? 'Not used yet'
          : `Used ${item.uses} ${item.uses === 1 ? 'time' : 'times'}${item.lastUsedOn ? `, last on ${day(item.lastUsedOn)}` : ''}`}
      </p>
    </li>
  );
}

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

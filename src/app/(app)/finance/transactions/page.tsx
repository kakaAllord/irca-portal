import type { Metadata } from 'next';
import Link from 'next/link';
import {
  formatMoney,
  type AccountsResponse,
  type CatalogItem,
  type FinanceTransaction,
} from '@/shared';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import { RecordButtons } from '@/modules/finance/components/RecordButtons';
import { EntryRow } from '@/modules/finance/components/EntryRow';
import { TransactionFilters } from './TransactionFilters';
import { ExportButton } from './ExportButton';

export const metadata: Metadata = { title: 'Transactions' };

type Listed = {
  rows: FinanceTransaction[];
  total: number;
  totals: { incomeTotal: string; expenseTotal: string; net: string; count: number };
};

const FILTERS = [
  'kind',
  'status',
  'from',
  'to',
  'incomeSourceId',
  'expenseItemId',
  'accountId',
  'departmentId',
  'q',
  'page',
] as const;

/** Everything recorded, with the totals for whatever is being looked at. */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!can(me, 'finance.transactions.read')) return <ForbiddenState what="finance entries" />;

  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of FILTERS) if (params[key]) query.set(key, params[key]);
  if (!params.from && !params.to) {
    // This month, unless someone asked for something else.
    const now = new Date();
    query.set('from', `${now.toISOString().slice(0, 7)}-01`);
  }

  const [data, sources, items, accounts] = await Promise.all([
    serverApi<Listed>(`/finance/transactions?${query}`),
    can(me, 'finance.catalog.read')
      ? serverApi<{ rows: CatalogItem[] }>('/finance/income-sources?status=all')
      : Promise.resolve({ rows: [] as CatalogItem[] }),
    can(me, 'finance.catalog.read')
      ? serverApi<{ rows: CatalogItem[] }>('/finance/expense-items?status=all')
      : Promise.resolve({ rows: [] as CatalogItem[] }),
    can(me, 'finance.accounts.read')
      ? serverApi<AccountsResponse>('/finance/accounts')
      : Promise.resolve(null),
  ]);
  const currency = me.church?.currency ?? 'TZS';

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every entry in the books. Voided ones stay, and stop counting."
        actions={
          <>
            {can(me, 'finance.transactions.export') && <ExportButton query={query.toString()} />}
            <RecordButtons timezone={me.church?.timezone ?? 'UTC'} />
          </>
        }
      />

      <TransactionFilters
        sources={sources.rows.map((r) => ({ id: r.id, name: r.name }))}
        items={items.rows.map((r) => ({ id: r.id, name: r.name }))}
        accounts={
          accounts
            ? accounts.methods.flatMap((m) =>
                m.accounts.map((a) => ({ id: a.id, name: a.name, method: m.name })),
              )
            : []
        }
      />

      <section
        aria-label="What is shown"
        className="mt-4 grid gap-px overflow-hidden rounded-[16px] border border-border bg-border sm:grid-cols-3"
      >
        <Total label="Came in" value={formatMoney(data.totals.incomeTotal, currency)} tone="in" />
        <Total
          label="Went out"
          value={formatMoney(data.totals.expenseTotal, currency)}
          tone="out"
        />
        <Total
          label={`Net, ${data.total} ${data.total === 1 ? 'entry' : 'entries'}`}
          value={formatMoney(data.totals.net, currency)}
        />
      </section>

      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState title="Nothing matches these filters">
            <Link href="/finance/transactions" className="text-accent underline">
              Clear them
            </Link>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {byDay(data.rows).map(([date, entries]) => {
              const counted = entries.filter((e) => e.status === 'POSTED');
              const inDay = sum(counted.filter((e) => e.kind === 'INCOME'));
              const outDay = sum(counted.filter((e) => e.kind === 'EXPENSE'));
              return (
                <section key={date} aria-label={longDay(date)}>
                  <h2 className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                    <span className="text-[12.5px] font-semibold text-fg">{longDay(date)}</span>
                    <span className="text-[11.5px] text-fg3 tabular-nums">
                      {[
                        inDay > 0 && `+${formatMoney(String(inDay), '')}`,
                        outDay > 0 && `−${formatMoney(String(outDay), '')}`,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </span>
                  </h2>
                  <ul className="divide-y divide-border2 overflow-hidden rounded-[16px] border border-border bg-surface">
                    {entries.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} currency={currency} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        <Pager
          path="/finance/transactions"
          params={withoutPage(query)}
          page={Math.max(1, Number(params.page) || 1)}
          pageSize={PAGE_SIZE}
          total={data.total}
        />
      </div>
    </>
  );
}

/** As the API pages them. */
const PAGE_SIZE = 25;

function Total({ label, value, tone }: { label: string; value: string; tone?: 'in' | 'out' }) {
  return (
    <div className="flex flex-col bg-surface px-5 py-4">
      <span className="text-[11.5px] text-fg3">{label}</span>
      <span
        className={`text-[19px] font-semibold tabular-nums ${tone === 'in' ? 'text-pos' : 'text-fg'}`}
      >
        {tone === 'in' ? '+' : tone === 'out' ? '−' : ''}
        {value}
      </span>
    </div>
  );
}

/** Entries arrive newest first; each day keeps them in that order. */
function byDay(rows: FinanceTransaction[]): [string, FinanceTransaction[]][] {
  const days: [string, FinanceTransaction[]][] = [];
  for (const row of rows) {
    const last = days.at(-1);
    if (last?.[0] === row.txnDate) last[1].push(row);
    else days.push([row.txnDate, [row]]);
  }
  return days;
}

const sum = (rows: FinanceTransaction[]) => rows.reduce((n, r) => n + Number(r.baseAmount), 0);

const withoutPage = (query: URLSearchParams) => {
  const next = new URLSearchParams(query);
  next.delete('page');
  return next;
};

const longDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

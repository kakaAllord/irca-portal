import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  formatMoney,
  type AccountsResponse,
  type FinanceTransaction,
  type MeResponse,
} from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { RecordButtons } from '@/modules/finance/components/RecordButtons';
import { Bars } from '@/modules/finance/components/Bars';
import { BankCard } from '@/modules/finance/components/BankCard';
import { EntryRow } from '@/modules/finance/components/EntryRow';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: 'Finance' };

type Group = { id: string; name: string; total: string; share: number };

type Overview = {
  month: string;
  income: string;
  expense: string;
  net: string;
  count: number;
  previous: { income: string; expense: string; net: string; count: number };
  bySource: Group[];
  topItems: Group[];
  trend: { month: string; income: string; expense: string }[];
  recent: FinanceTransaction[] | null;
};

/**
 * What each account holds today, as cards, then one month at a time: the net
 * in large figures, where the money came from and went, twelve months side by
 * side, and the latest entries. The month switcher sits with the month's
 * figures, so changing it never seems to change the balances above it, which
 * are always today's.
 */
export default async function FinanceOverview({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.overview.read')) return <ForbiddenState what="the finance overview" />;

  const { month } = await searchParams;
  // A typed-in month beyond today is clamped rather than obeyed: the API refuses
  // future-dated entries, so those months can only ever be zeros.
  const asked = month && month < thisMonth() ? month : thisMonth();
  const [data, accounts] = await Promise.all([
    serverApi<Overview>(`/finance/overview?month=${asked}`),
    can(me, 'finance.accounts.read')
      ? serverApi<AccountsResponse>('/finance/accounts')
      : Promise.resolve(null),
  ]);
  const held = (accounts?.methods ?? []).flatMap((m) =>
    m.accounts.filter((a) => a.isActive).map((account) => ({ account, method: m })),
  );
  const currency = me.church?.currency ?? 'TZS';
  const shown = monthName(data.month);
  const net = Number(data.net);

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle={`Income and expenses for ${me.church?.name ?? 'this church'}.`}
        actions={<RecordButtons timezone={me.church?.timezone ?? 'UTC'} />}
      />

      {held.length > 0 && (
        <section aria-labelledby="held-heading">
          <Heading id="held-heading" link={{ href: '/finance/accounts', label: 'All accounts' }}>
            What each account holds today
          </Heading>
          <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
            {held.map(({ account, method }) => (
              <li key={account.id} className="w-[260px] flex-none snap-start">
                <Link href="/finance/accounts" aria-label={`${account.name}, ${method.name}`}>
                  <BankCard
                    account={account}
                    kind={method.kind}
                    methodName={method.name}
                    church={me.church?.code ?? 'Church'}
                    showCurrency={accounts!.foreign}
                    compact
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className={cn(
          'mb-3 flex flex-wrap items-center justify-between gap-2',
          held.length > 0 && 'mt-8',
        )}
      >
        <h2 className="text-[14px] font-semibold text-fg">Money in and out</h2>
        <MonthSwitcher month={data.month} />
      </div>

      <section
        aria-label={`${shown} in figures`}
        className="grid gap-px overflow-hidden rounded-[18px] border border-border bg-border lg:grid-cols-[1.3fr_1fr_1fr]"
      >
        <div className="flex flex-col justify-center gap-1 bg-surface p-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-fg3 uppercase">
            {net >= 0 ? 'Kept' : 'Short'} in {shown}
          </p>
          <p
            className={cn(
              'text-[32px] leading-tight font-semibold tabular-nums',
              net >= 0 ? 'text-fg' : 'text-danger',
            )}
          >
            {formatMoney(data.net, currency)}
          </p>
          <p className="text-[12px] text-fg3">
            What came in less what went out, across {data.count}{' '}
            {data.count === 1 ? 'entry' : 'entries'}.
          </p>
        </div>
        <Flow
          label="Came in"
          value={formatMoney(data.income, currency)}
          change={change(data.income, data.previous.income)}
          good="up"
          tone="in"
        />
        <Flow
          label="Went out"
          value={formatMoney(data.expense, currency)}
          change={change(data.expense, data.previous.expense)}
          good="down"
          tone="out"
        />
      </section>

      {data.count === 0 && (
        <div className="mt-4">
          <EmptyState title="Nothing recorded yet">
            Record the first income or expense for {shown}.
          </EmptyState>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Where it came from" sub={`Income by source, ${shown}`}>
          <Bars rows={data.bySource} currency={currency} tone="in" />
        </Panel>
        <Panel title="Where it went" sub={`The largest expenses, ${shown}`}>
          <Bars rows={data.topItems} currency={currency} tone="out" />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="The last twelve months"
          sub="Income beside expenses, month by month"
          aside={
            <span className="flex items-center gap-3 text-[11.5px] text-fg3">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-pos" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-[#b4532a]" /> Out
              </span>
            </span>
          }
        >
          <Trend rows={data.trend} currency={currency} current={data.month} />
        </Panel>
      </div>

      {data.recent && data.recent.length > 0 && (
        <section className="mt-7">
          <Heading link={{ href: '/finance/transactions', label: 'All transactions' }}>
            Latest entries
          </Heading>
          <ul className="divide-y divide-border2 overflow-hidden rounded-[16px] border border-border bg-surface">
            {data.recent.map((entry) => (
              <EntryRow key={entry.id} entry={entry} currency={currency} showDate />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Heading({
  id,
  link,
  children,
}: {
  id?: string;
  link: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 id={id} className="text-[14px] font-semibold text-fg">
        {children}
      </h2>
      <Link href={link.href} className="text-[12px] font-medium text-accent hover:underline">
        {link.label} →
      </Link>
    </div>
  );
}

function Panel({
  title,
  sub,
  aside,
  children,
}: {
  title: string;
  sub: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
          <p className="text-[12px] text-fg3">{sub}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Money in or out for the month, and how it compares with the month before. */
function Flow({
  label,
  value,
  change,
  good,
  tone,
}: {
  label: string;
  value: string;
  change: number | null;
  /** Which way is good news: more income, or fewer expenses. */
  good: 'up' | 'down';
  tone: 'in' | 'out';
}) {
  const better = change !== null && (good === 'up' ? change >= 0 : change <= 0);
  return (
    <div className="flex items-center gap-3 bg-surface p-5">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-11 flex-none items-center justify-center rounded-full',
          tone === 'in' ? 'bg-pos-bg text-pos' : 'bg-danger-bg text-danger',
        )}
      >
        <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor">
          <path
            d={tone === 'in' ? 'M8 13V3M4 7l4-4 4 4' : 'M8 3v10M4 9l4 4 4-4'}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11.5px] text-fg3">{label}</span>
        <span className="text-[19px] leading-tight font-semibold tabular-nums text-fg">
          {value}
        </span>
        {change !== null && (
          <span
            className={cn(
              'mt-0.5 w-fit rounded-full px-1.5 text-[11px] font-medium tabular-nums',
              better ? 'bg-pos-bg text-pos' : 'bg-danger-bg text-danger',
            )}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% on last month
          </span>
        )}
      </span>
    </div>
  );
}

/** Left out entirely when last month was zero: there is no "+∞%". */
function change(now: string, before: string): number | null {
  const previous = Number(before);
  if (previous <= 0) return null;
  return Math.round(((Number(now) - previous) / previous) * 100);
}

function Trend({
  rows,
  currency,
  current,
}: {
  rows: { month: string; income: string; expense: string }[];
  currency: string;
  current: string;
}) {
  const highest = Math.max(1, ...rows.flatMap((r) => [Number(r.income), Number(r.expense)]));
  return (
    <div className="flex items-end gap-1 overflow-x-auto">
      {rows.map((row) => {
        const name = new Date(`${row.month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
          month: 'short',
          timeZone: 'UTC',
        });
        const label = `${monthName(row.month)}: in ${formatMoney(row.income, currency)}, out ${formatMoney(row.expense, currency)}`;
        return (
          <Link
            key={row.month}
            href={`/finance?month=${row.month}`}
            title={label}
            aria-label={label}
            className={cn(
              'flex min-w-[44px] flex-1 flex-col items-center gap-1.5 rounded-[10px] px-1 pt-2 pb-1.5 hover:bg-hover',
              row.month === current && 'bg-chip',
            )}
          >
            <span className="flex h-32 items-end gap-1" aria-hidden="true">
              <span
                className="w-3 rounded-t-[4px] bg-pos"
                style={{ height: `${Math.max((Number(row.income) / highest) * 100, 1)}%` }}
              />
              <span
                className="w-3 rounded-t-[4px] bg-[#b4532a]"
                style={{ height: `${Math.max((Number(row.expense) / highest) * 100, 1)}%` }}
              />
            </span>
            <span
              className={cn(
                'text-[11px]',
                row.month === current ? 'font-semibold text-fg' : 'text-fg3',
              )}
            >
              {name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** The month we are in, as `YYYY-MM`. Months sort correctly as strings in this shape. */
function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function MonthSwitcher({ month }: { month: string }) {
  const [year, m] = month.split('-').map(Number);
  const shift = (by: number) => {
    const d = new Date(Date.UTC(year!, m! - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const shown = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  // Forward stops at the month we are in. Walking past it can only show zeros,
  // because a transaction dated in the future is refused when it is recorded.
  const atToday = month >= thisMonth();
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5 text-[12.5px]">
      <Link href={`/finance?month=${shift(-1)}`} aria-label="Previous month" className={ARROW}>
        ‹
      </Link>
      <span className="min-w-[116px] text-center font-medium text-fg">{shown}</span>
      {atToday ? (
        <span aria-hidden className={cn(ARROW, 'text-border hover:bg-transparent')}>
          ›
        </span>
      ) : (
        <Link href={`/finance?month=${shift(1)}`} aria-label="Next month" className={ARROW}>
          ›
        </Link>
      )}
    </span>
  );
}

const ARROW =
  'flex size-8 items-center justify-center rounded-full text-fg2 hover:bg-hover hover:text-fg';

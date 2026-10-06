import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, type BudgetMonth, type MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
import { CopyLastMonth, SetBudget } from './BudgetActions';

export const metadata: Metadata = { title: 'Budgets' };

/**
 * What each department may spend this month, and what it has used.
 *
 * Used is the expenses tagged with the department, worked out every time.
 * Going over is shown, never prevented: the money was spent, and the books
 * say so (D40).
 */
export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.budgets.read')) return <ForbiddenState what="department budgets" />;

  const { month } = await searchParams;
  const asked = month && /^\d{4}-\d{2}$/.test(month) ? month : thisMonth();
  const data = await serverApi<BudgetMonth>(`/finance/budgets?month=${asked}`);
  const currency = me.church?.currency ?? 'TZS';
  const shown = monthName(data.month);

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="What each department may spend in a month, and what it has used."
        actions={
          <>
            <MonthSwitcher month={data.month} />
            {data.copyable > 0 && <CopyLastMonth month={data.month} count={data.copyable} />}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tile
          label={`Allocated for ${shown}`}
          value={formatMoney(data.totals.allocated, currency)}
        />
        <Tile label="Used" value={formatMoney(data.totals.used, currency)} />
        <Tile label="Over their budget" value={String(data.lines.filter((l) => l.over).length)} />
      </div>

      {data.lines.length === 0 ? (
        <EmptyState title="No departments yet">
          Administrators add departments in Admin → Departments.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-border2 rounded-[10px] border border-border bg-surface">
          {data.lines.map((line) => {
            const allocated = Number(line.allocated ?? 0);
            const used = Number(line.used);
            const share =
              allocated > 0 ? Math.min(100, (used / allocated) * 100) : used > 0 ? 100 : 0;
            return (
              <li key={line.department.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/finance/transactions?kind=EXPENSE&departmentId=${line.department.id}&from=${data.month}-01&to=${monthEnd(data.month)}`}
                    className="text-[13px] font-medium text-fg hover:underline"
                  >
                    {line.department.name}
                  </Link>
                  {line.over && <Badge tone="danger">Over</Badge>}
                  {line.near && <Badge tone="accent">Nearly used</Badge>}
                  <span className="ml-auto">
                    <SetBudget
                      line={line}
                      month={data.month}
                      monthName={shown}
                      currency={currency}
                    />
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface2"
                  role="img"
                  aria-label={
                    line.allocated === null
                      ? 'No budget set'
                      : `${Math.round((used / Math.max(allocated, 1)) * 100)}% used`
                  }
                >
                  <div
                    className={`h-full rounded-full ${line.over ? 'bg-danger' : line.near ? 'bg-accent' : 'bg-pos'}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
                <p className="text-[12px] text-fg2 tabular-nums">
                  {line.allocated === null ? (
                    <>No budget set · {formatMoney(line.used, currency)} used</>
                  ) : (
                    <>
                      {formatMoney(line.used, currency)} of {formatMoney(line.allocated, currency)}{' '}
                      used ·{' '}
                      {line.over ? (
                        <span className="font-medium text-danger">
                          {formatMoney(String(-Number(line.remaining)), currency)} over
                        </span>
                      ) : (
                        <>{formatMoney(line.remaining ?? '0', currency)} left</>
                      )}
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] text-fg3">
        Unspent money does not carry into the next month. Tag an expense with its department when
        recording it for it to count here.
      </p>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-3.5">
      <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">{label}</p>
      <p className="mt-1 text-[17px] font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const monthEnd = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
};

/** Budgets are set ahead, so the switcher goes a year forward as well as back. */
function MonthSwitcher({ month }: { month: string }) {
  const [year, m] = month.split('-').map(Number);
  const shift = (by: number) => {
    const d = new Date(Date.UTC(year!, m! - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  return (
    <span className="flex items-center gap-1 text-[12.5px] text-fg2">
      <Link
        href={`/finance/budgets?month=${shift(-1)}`}
        aria-label="Previous month"
        className="px-1.5"
      >
        ‹
      </Link>
      <span className="min-w-[110px] text-center font-medium text-fg">{monthName(month)}</span>
      <Link href={`/finance/budgets?month=${shift(1)}`} aria-label="Next month" className="px-1.5">
        ›
      </Link>
    </span>
  );
}

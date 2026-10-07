import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney, type BudgetLine, type BudgetMonth, type MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { CopyLastMonth, SetBudget } from './BudgetActions';

export const metadata: Metadata = { title: 'Budgets' };

type State = 'over' | 'near' | 'ahead' | 'fine' | 'unbudgeted' | 'idle';

const STATE: Record<State, { label: string; pill: string; bar: string }> = {
  over: { label: 'Over budget', pill: 'bg-danger-bg text-danger', bar: 'bg-danger' },
  near: { label: 'Nearly used', pill: 'bg-warn-bg text-warn-fg', bar: 'bg-warn-fg' },
  ahead: { label: 'Spending fast', pill: 'bg-warn-bg text-warn-fg', bar: 'bg-accent' },
  fine: { label: 'On track', pill: 'bg-pos-bg text-pos', bar: 'bg-pos' },
  unbudgeted: { label: 'No budget', pill: 'bg-warn-bg text-warn-fg', bar: 'bg-warn-fg' },
  idle: { label: 'No budget', pill: 'bg-chip text-fg3', bar: 'bg-border' },
};

/**
 * What each department may spend in a month, and how fast it is going.
 *
 * Used is the expenses tagged with the department, worked out every time.
 * Going over is shown, never prevented: the money was spent, and the books
 * say so (D40). The page leads with what needs doing: the departments still
 * waiting for a budget this month, those spending with none first, then one
 * over, then the rest by how fast they are going.
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
  const money = (v: number | string) => formatMoney(String(v), currency);

  // How far through the month we are: all of a past one, none of a future one.
  const elapsed = monthElapsed(data.month);
  const stateOf = (line: BudgetLine): State => {
    const used = Number(line.used);
    if (line.allocated === null) return used > 0 ? 'unbudgeted' : 'idle';
    if (line.over) return 'over';
    if (line.near) return 'near';
    const share = used / Math.max(Number(line.allocated), 1);
    return elapsed !== null && elapsed < 1 && share > elapsed + 0.25 ? 'ahead' : 'fine';
  };
  const lines = data.lines.map((line) => ({ line, state: stateOf(line) }));
  const ORDER: State[] = ['over', 'near', 'ahead', 'fine'];
  const budgeted = lines
    .filter((l) => l.line.allocated !== null)
    .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
  // Spending with no budget comes first: that money is going unmeasured.
  const waiting = lines
    .filter((l) => l.line.allocated === null)
    .sort((a, b) => Number(b.line.used) - Number(a.line.used));

  const allocated = Number(data.totals.allocated);
  const used = Number(data.totals.used);
  const usedShare = allocated > 0 ? used / allocated : 0;
  const over = lines.filter((l) => l.state === 'over');
  const unbudgeted = lines.filter((l) => l.state === 'unbudgeted');
  const fast = lines.filter((l) => l.state === 'ahead' || l.state === 'near');
  const expensesOf = (id: string) =>
    `/finance/transactions?kind=EXPENSE&departmentId=${id}&from=${data.month}-01&to=${monthEnd(data.month)}`;

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="What each department may spend in a month, and how fast it is going."
        actions={
          <>
            <MonthSwitcher month={data.month} />
            {data.copyable > 0 && <CopyLastMonth month={data.month} count={data.copyable} />}
          </>
        }
      />

      {data.lines.length === 0 ? (
        <EmptyState title="No departments yet">
          Administrators add departments in Admin → Departments.
        </EmptyState>
      ) : (
        <>
          <section
            aria-label={`${shown} at a glance`}
            className="mb-6 grid gap-5 rounded-[18px] border border-border bg-surface p-5 md:grid-cols-[auto_1fr]"
          >
            <Ring
              share={usedShare}
              over={used > allocated && allocated > 0}
              ahead={elapsed !== null && elapsed < 1 && usedShare > elapsed + 0.05}
            />
            <div className="flex flex-col justify-center gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-fg3 uppercase">
                  {shown}
                </p>
                {allocated > 0 ? (
                  <p className="text-[24px] leading-tight font-semibold text-fg tabular-nums">
                    {used > allocated
                      ? `${money(used - allocated)} over`
                      : `${money(allocated - used)} left`}
                    <span className="ml-2 text-[13px] font-normal text-fg3">
                      of {money(allocated)} budgeted
                    </span>
                  </p>
                ) : (
                  <p className="text-[20px] font-semibold text-fg">No budgets set for {shown}</p>
                )}
                <p className="mt-0.5 text-[12.5px] text-fg2">
                  {money(used)} spent by departments
                  {elapsed !== null &&
                    elapsed > 0 &&
                    elapsed < 1 &&
                    `, with ${Math.round(elapsed * 100)}% of the month gone`}
                  .
                </p>
              </div>
              {elapsed !== null && elapsed > 0 && elapsed < 1 && allocated > 0 && (
                <PaceBar used={Math.min(usedShare, 1)} elapsed={elapsed} />
              )}
              <div className="flex flex-wrap gap-2">
                <Count n={over.length} label="over budget" tone="danger" />
                <Count n={unbudgeted.length} label="spending with no budget" tone="warn" />
                <Count n={fast.length} label="spending fast" tone="warn" />
              </div>
            </div>
          </section>

          {waiting.length > 0 && (
            <section
              aria-labelledby="waiting-heading"
              className="mb-6 rounded-[18px] border border-warn-br bg-warn-bg/50 p-4"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id="waiting-heading" className="text-[13.5px] font-semibold text-fg">
                  Waiting for a budget
                  <span className="ml-1.5 font-normal text-fg3">· {waiting.length}</span>
                </h2>
                <p className="text-[12px] text-fg2">
                  Set what each may spend in {shown}, so its spending is measured.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {waiting.map(({ line, state }) => (
                  <li
                    key={line.department.id}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-3.5 py-2.5"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium text-fg">
                        {line.department.name}
                      </span>
                      {state === 'unbudgeted' ? (
                        <Link
                          href={expensesOf(line.department.id)}
                          className="text-[11.5px] text-warn-fg tabular-nums hover:underline"
                        >
                          {money(line.used)} spent already
                        </Link>
                      ) : (
                        <span className="text-[11.5px] text-fg3">Nothing spent yet</span>
                      )}
                    </span>
                    <SetBudget
                      line={line}
                      month={data.month}
                      monthName={shown}
                      currency={currency}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {over.length > 0 && (
            <section aria-label="To do" className="mb-6 flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-fg">To do</h2>
              {over.map(({ line }) => (
                <ToDo key={line.department.id} tone="danger">
                  <span>
                    <strong>{line.department.name}</strong> has spent{' '}
                    {money(-Number(line.remaining))} more than its {money(line.allocated!)}.{' '}
                    <Link href={expensesOf(line.department.id)} className="underline">
                      See what was spent
                    </Link>
                    , and raise the budget if the spending was agreed.
                  </span>
                  <SetBudget line={line} month={data.month} monthName={shown} currency={currency} />
                </ToDo>
              ))}
            </section>
          )}

          {budgeted.length > 0 && (
            <section aria-label="Departments">
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {budgeted.map(({ line, state }) => (
                  <DepartmentCard
                    key={line.department.id}
                    line={line}
                    state={state}
                    elapsed={elapsed}
                    money={money}
                    href={expensesOf(line.department.id)}
                    action={
                      <SetBudget
                        line={line}
                        month={data.month}
                        monthName={shown}
                        currency={currency}
                      />
                    }
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <p className="mt-6 text-[11.5px] text-fg3">
        Unspent money does not carry into the next month. An expense counts here when it is recorded
        with its department.
      </p>
    </>
  );
}

function DepartmentCard({
  line,
  state,
  elapsed,
  money,
  href,
  action,
}: {
  line: BudgetLine;
  state: State;
  elapsed: number | null;
  money: (v: number | string) => string;
  href: string;
  action: ReactNode;
}) {
  const allocated = Number(line.allocated ?? 0);
  const used = Number(line.used);
  const share = allocated > 0 ? used / allocated : 1;
  const look = STATE[state];
  return (
    <li className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="text-[13.5px] font-semibold text-fg hover:underline">
          {line.department.name}
        </Link>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', look.pill)}>
          {look.label}
        </span>
      </div>
      <div>
        <p
          className={cn(
            'text-[22px] leading-tight font-semibold tabular-nums',
            state === 'over' ? 'text-danger' : 'text-fg',
          )}
        >
          {line.allocated === null
            ? money(used)
            : state === 'over'
              ? `${money(-Number(line.remaining))} over`
              : `${money(line.remaining ?? 0)} left`}
        </p>
        <p className="text-[12px] text-fg3 tabular-nums">
          {line.allocated === null
            ? 'spent with no budget set'
            : `${money(used)} of ${money(allocated)} used · ${Math.round(share * 100)}%`}
        </p>
      </div>
      <div className="relative">
        <div className="h-2.5 overflow-hidden rounded-full bg-chip">
          <div
            className={cn('h-full rounded-full', look.bar)}
            style={{ width: `${Math.min(100, share * 100)}%` }}
          />
        </div>
        {/* Where spending would be if it kept pace with the month. */}
        {elapsed !== null && elapsed > 0 && elapsed < 1 && line.allocated !== null && (
          <span
            aria-hidden="true"
            title="Where spending would be at an even pace"
            className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-fg2"
            style={{ left: `${elapsed * 100}%` }}
          />
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border2 pt-3">
        <span className="truncate text-[11px] text-fg3">
          {line.setBy ? `Set by ${line.setBy}` : 'Not set yet'}
        </span>
        {action}
      </div>
    </li>
  );
}

/** The month's spending as a ring, the share used in its middle. */
function Ring({ share, over, ahead }: { share: number; over: boolean; ahead: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const shown = Math.min(1, share);
  return (
    <div
      className="relative mx-auto size-[136px]"
      role="img"
      aria-label={`${Math.round(share * 100)}% used`}
    >
      <svg viewBox="0 0 136 136" className="size-full -rotate-90">
        <circle cx="68" cy="68" r={r} fill="none" strokeWidth="14" className="stroke-chip" />
        <circle
          cx="68"
          cy="68"
          r={r}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${shown * c} ${c}`}
          className={
            over ? 'stroke-danger' : share >= 0.9 || ahead ? 'stroke-warn-fg' : 'stroke-pos'
          }
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-semibold text-fg tabular-nums">
          {Math.round(share * 100)}%
        </span>
        <span className="text-[11px] text-fg3">used</span>
      </span>
    </div>
  );
}

/** Spending against the month: the bar is what is used, the marker today. */
function PaceBar({ used, elapsed }: { used: number; elapsed: number }) {
  const ahead = used > elapsed + 0.05;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-2.5 rounded-full bg-chip">
        <div
          className={cn('h-full rounded-full', ahead ? 'bg-warn-fg' : 'bg-pos')}
          style={{ width: `${used * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-fg"
          style={{ left: `${elapsed * 100}%` }}
        />
      </div>
      <p className="text-[11.5px] text-fg3">
        {ahead
          ? 'Spending is ahead of the month: at this rate the budgets run out before it ends.'
          : 'Spending is keeping pace with the month.'}{' '}
        The marker is today.
      </p>
    </div>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: 'danger' | 'warn' }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px]',
        n === 0
          ? 'border-border text-fg3'
          : tone === 'danger'
            ? 'border-danger-br bg-danger-bg text-danger'
            : 'border-warn-br bg-warn-bg text-warn-fg',
      )}
    >
      <strong className="tabular-nums">{n}</strong> {label}
    </span>
  );
}

function ToDo({ tone, children }: { tone: 'danger' | 'warn'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-[12.5px]',
        tone === 'danger'
          ? 'border-danger-br bg-danger-bg text-danger'
          : 'border-warn-br bg-warn-bg text-warn-fg',
      )}
    >
      {children}
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

/** The share of the month gone: 1 for a past month, 0 for a future one. */
function monthElapsed(month: string): number | null {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return null;
  const start = Date.UTC(y, m - 1, 1);
  const end = Date.UTC(y, m, 1);
  const now = Date.now();
  if (now >= end) return 1;
  if (now < start) return 0;
  return (now - start) / (end - start);
}

/** Budgets are set ahead, so the switcher goes a year forward as well as back. */
function MonthSwitcher({ month }: { month: string }) {
  const [year, m] = month.split('-').map(Number);
  const shift = (by: number) => {
    const d = new Date(Date.UTC(year!, m! - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const arrow =
    'flex size-8 items-center justify-center rounded-full text-fg2 hover:bg-hover hover:text-fg';
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5 text-[12.5px]">
      <Link
        href={`/finance/budgets?month=${shift(-1)}`}
        aria-label="Previous month"
        className={arrow}
      >
        ‹
      </Link>
      <span className="min-w-[116px] text-center font-medium text-fg">{monthName(month)}</span>
      <Link href={`/finance/budgets?month=${shift(1)}`} aria-label="Next month" className={arrow}>
        ›
      </Link>
    </span>
  );
}

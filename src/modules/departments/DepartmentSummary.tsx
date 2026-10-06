import Link from 'next/link';
import { formatMoney, type MeResponse } from '@/shared';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import type { DepartmentSummary as Summary, SummaryPeriod, SummaryTile } from './types';

const PERIODS: { key: SummaryPeriod; label: string; against: string }[] = [
  { key: 'this_month', label: 'This month', against: 'the same days last month' },
  { key: 'last_month', label: 'Last month', against: 'the month before' },
  { key: 'this_year', label: 'This year', against: 'the same days last year' },
];

/**
 * A department's numbers for the pastors and administrators who oversee it
 * (docs/plan/14, step 14.4): big numbers first, each against the period
 * before, then one or two short lists. A number links on only when the
 * person looking may open what is behind it; a pastor is never sent into a
 * portal that is not theirs.
 */
export function DepartmentSummary({
  summary,
  me,
  path,
}: {
  summary: Summary;
  me: MeResponse;
  /** This page, for the period switch. */
  path: string;
}) {
  const currency = me.church?.currency ?? 'TZS';
  const period = PERIODS.find((p) => p.key === summary.period.key)!;
  const money = (value: string) => formatMoney(value, currency);
  const range = `from=${summary.period.from}&to=${summary.period.to}`;

  return (
    <section aria-labelledby="summary" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="summary" className="text-[14px] font-semibold text-fg">
          Summary
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/departments/${summary.department.id}/summary.pdf?period=${period.key}`}
            className="h-8 rounded-[7px] border border-border px-3 text-[12px] leading-8 font-medium text-fg hover:bg-hover"
          >
            Download PDF
          </a>
          <nav aria-label="Period" className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={p.key === 'this_month' ? path : `${path}?period=${p.key}`}
                aria-current={p.key === period.key ? 'page' : undefined}
                scroll={false}
                className={cn(
                  'h-8 rounded-[7px] border px-3 text-[12px] leading-8 font-medium',
                  p.key === period.key
                    ? 'border-accent-br bg-chip text-accent'
                    : 'border-border text-fg2 hover:bg-hover',
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {summary.finance && (
        <>
          <Tiles>
            <Tile
              label="Income"
              value={money(summary.finance.income.value)}
              change={change(summary.finance.income, period.against)}
              href={
                can(me, 'finance.transactions.read')
                  ? `/finance/transactions?kind=INCOME&${range}`
                  : undefined
              }
            />
            <Tile
              label="Offerings"
              value={money(summary.finance.offerings.value)}
              change={change(summary.finance.offerings, period.against)}
            />
            <Tile
              label="Expenses"
              value={money(summary.finance.expenses.value)}
              change={change(summary.finance.expenses, period.against)}
              href={
                can(me, 'finance.transactions.read')
                  ? `/finance/transactions?kind=EXPENSE&${range}`
                  : undefined
              }
            />
            <Tile
              label="Income less expenses"
              value={money(summary.finance.net.value)}
              change={change(summary.finance.net, period.against)}
            />
          </Tiles>
          {summary.finance.accounts.length > 0 && (
            <List
              title="What each account holds today"
              rows={summary.finance.accounts.map((a) => [
                `${a.name} · ${a.method}`,
                a.balance === null ? '—' : formatMoney(a.balance, a.currency),
              ])}
              empty=""
            />
          )}
          {summary.finance.budgets.lines.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-fg">
                Budgets this month: used of allocated
              </h3>
              <ul className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-3.5">
                {summary.finance.budgets.lines.map((line) => (
                  <li key={line.department.id} className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                      <span className="font-medium text-fg">{line.department.name}</span>
                      <span className={line.over ? 'text-danger' : 'text-fg2'}>
                        {money(line.used)} of {money(line.allocated!)}
                        {line.over && ' · over'}
                      </span>
                    </span>
                    <Progress paid={line.used} of={line.allocated!} word="used" over={line.over} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <List
              title="Income by source"
              rows={summary.finance.incomeBySource.map((r) => [r.name, money(r.total)])}
              empty="Nothing recorded in this period."
            />
            <List
              title="Expenses by item"
              rows={summary.finance.expensesByItem.map((r) => [r.name, money(r.total)])}
              empty="Nothing recorded in this period."
            />
          </div>
          {summary.finance.pledgeCampaigns.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-fg">Pledge campaigns</h3>
              <ul className="grid gap-2 lg:grid-cols-2">
                {summary.finance.pledgeCampaigns.map((c) => {
                  const body = (
                    <>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-fg">{c.name}</span>
                        <span className="text-[11.5px] text-fg3">
                          {c.people} {c.people === 1 ? 'person' : 'people'}
                        </span>
                      </span>
                      <Progress paid={c.paid} of={c.target ?? c.pledged} />
                      <span className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12px] sm:grid-cols-4">
                        {c.target && <Figure label="Target" value={money(c.target)} />}
                        <Figure label="Pledged" value={money(c.pledged)} />
                        <Figure label="Paid" value={money(c.paid)} />
                        <Figure label="Remaining" value={money(c.remaining)} />
                      </span>
                    </>
                  );
                  return (
                    <li key={c.id}>
                      {summary.finance!.pledgeNames ? (
                        <Link
                          href={`${path.split('?')[0]}/pledges/${c.id}`}
                          className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-3.5 hover:border-accent-br"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-surface p-3.5">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {summary.comms && (
        <>
          <Tiles>
            <Tile
              label="Messages sent"
              value={count(summary.comms.messages.value)}
              change={change(summary.comms.messages, period.against)}
              href={can(me, 'comms.messages.read') ? '/comms/history' : undefined}
            />
            <Tile
              label="Texts used"
              value={count(summary.comms.texts.value)}
              change={change(summary.comms.texts, period.against)}
            />
            <Tile
              label="What they cost"
              value={money(summary.comms.cost.value)}
              change={change(summary.comms.cost, period.against)}
            />
            <Tile
              label="Credit left at Beem"
              value={summary.comms.credit === null ? 'Not known yet' : count(summary.comms.credit)}
            />
            <Tile
              label="Texts that failed"
              value={count(summary.comms.failed.value)}
              change={change(summary.comms.failed, period.against)}
            />
            <Tile
              label="Opted out"
              value={count(summary.comms.optedOut.value)}
              change={change(summary.comms.optedOut, period.against)}
            />
          </Tiles>
          <List
            title="Waiting and running"
            rows={[
              [
                'Templates waiting in Communications',
                count(summary.comms.templatesWaiting.inComms),
              ],
              [
                'Templates waiting for an administrator',
                count(summary.comms.templatesWaiting.withAdministrators),
              ],
              ['Recurring messages running', count(summary.comms.recurring)],
            ]}
          />
        </>
      )}

      {summary.outreach && (
        <>
          <Tiles>
            <Tile
              label="GO days held"
              value={count(summary.outreach.goDays.value)}
              change={change(summary.outreach.goDays, period.against)}
              href={can(me, 'outreach.sessions.read') ? '/outreach/sessions' : undefined}
            />
            <Tile
              label="People reached"
              value={count(summary.outreach.reached.value)}
              change={change(summary.outreach.reached, period.against)}
              href={can(me, 'outreach.dashboard.read') ? `/outreach?${range}` : undefined}
            />
            <Tile
              label="Saved"
              value={count(summary.outreach.saved.value)}
              change={change(summary.outreach.saved, period.against)}
            />
            <Tile
              label="Followed up"
              value={count(summary.outreach.followedUp.value)}
              change={change(summary.outreach.followedUp, period.against)}
            />
          </Tiles>
          <List
            title="Follow-up and training"
            rows={[
              ['Still waiting to be followed up', count(summary.outreach.awaiting)],
              [
                'Training attendance',
                summary.outreach.training.of
                  ? `${summary.outreach.training.attended} of ${summary.outreach.training.of}`
                  : 'No training in this period',
              ],
              [
                'Next GO day',
                summary.outreach.nextGoDay
                  ? [longDay(summary.outreach.nextGoDay.on), summary.outreach.nextGoDay.title]
                      .filter(Boolean)
                      .join(' · ')
                  : 'None planned',
              ],
            ]}
          />
        </>
      )}

      <Tiles>
        <Tile label="Leaders" value={count(summary.people.leaders)} />
        <Tile label="Members" value={count(summary.people.members)} />
        <Tile
          label="Joined"
          value={count(summary.people.joined.value)}
          change={change(summary.people.joined, period.against)}
        />
        {summary.budget && (
          <Tile
            label={summary.budget.over ? 'Over its budget this month' : 'Budget used this month'}
            value={money(summary.budget.used)}
            change={
              summary.budget.over
                ? `of ${money(summary.budget.allocated)}: ${money(String(-Number(summary.budget.remaining)))} over`
                : `of ${money(summary.budget.allocated)}: ${money(summary.budget.remaining)} left`
            }
            href={can(me, 'finance.budgets.read') ? '/finance/budgets' : undefined}
          />
        )}
        {!summary.comms && (
          <Tile
            label="Messages it sent"
            value={count(summary.messages.messages.value)}
            change={change(summary.messages.messages, period.against)}
          />
        )}
      </Tiles>
    </section>
  );
}

function Tiles({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function Tile({
  label,
  value,
  change,
  href,
}: {
  label: string;
  value: string;
  change?: string | null;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">{label}</p>
      <p className="mt-1 text-[19px] font-semibold tabular-nums text-fg">{value}</p>
      {change && <p className="mt-0.5 text-[11.5px] text-fg3">{change}</p>}
    </>
  );
  const box = 'rounded-[10px] border border-border bg-surface p-3.5';
  return href ? (
    <Link href={href} className={cn(box, 'hover:border-accent-br')}>
      {inner}
    </Link>
  ) : (
    <div className={box}>{inner}</div>
  );
}

function List({ title, rows, empty }: { title: string; rows: [string, string][]; empty?: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface p-3.5">
      <h3 className="mb-2 text-[13px] font-semibold text-fg">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-fg3">{empty}</p>
      ) : (
        <dl className="flex flex-col gap-1.5 text-[12.5px]">
          {rows.map(([name, value]) => (
            <div key={name} className="flex items-baseline justify-between gap-3">
              <dt className="text-fg2">{name}</dt>
              <dd className="font-medium tabular-nums text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[11px] text-fg3">{label}</span>
      <span className="font-medium tabular-nums text-fg">{value}</span>
    </span>
  );
}

function Progress({
  paid,
  of,
  word = 'paid',
  over = false,
}: {
  paid: string;
  of: string;
  word?: string;
  /** Past what it had: drawn in red. */
  over?: boolean;
}) {
  const share = Number(of) > 0 ? Math.min(100, (Number(paid) / Number(of)) * 100) : 0;
  return (
    <span
      role="img"
      aria-label={`${Math.round((Number(paid) / Math.max(Number(of), 1)) * 100)}% ${word}`}
      className="block h-1.5 overflow-hidden rounded-full bg-chip"
    >
      <span
        className={cn('block h-full rounded-full', over ? 'bg-danger' : 'bg-pos')}
        style={{ width: `${share}%` }}
      />
    </span>
  );
}

const count = (n: number) => n.toLocaleString('en-GB');

/** Left out when the period before was nothing: there is no "+∞%". */
function change(tile: SummaryTile, against: string): string | null {
  const before = Number(tile.previous);
  if (before <= 0) return null;
  const percent = Math.round(((Number(tile.value) - before) / before) * 100);
  return `${percent >= 0 ? '+' : ''}${percent}% on ${against}`;
}

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

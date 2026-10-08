import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { LineChart } from '@/modules/dev/components/Charts';
import { churchToday, longDay, type Dashboard } from '@/modules/outreach/types';

export const metadata: Metadata = { title: 'Outreach' };

/**
 * The four the owner kept (7 Oct 2026): who was reached, who was saved, who
 * still waits for a call or visit, and who came to church. The API counts the
 * rest too, and each still has its own list; the dashboard leaves them out so
 * these four are read first.
 */
const ORDER = ['reached', 'salvations', 'awaiting', 'firstTime'];

/**
 * The numbers the Outreach leader reports upward, for a week, a month or a
 * year. Every number opens the list it was counted from.
 */
export default async function OutreachDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'outreach.dashboard.read')) return <ForbiddenState what="the Outreach dashboard" />;
  const params = await searchParams;
  const today = churchToday(me.church?.timezone);
  const presets = periods(today);
  const asked = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
  const data = await serverApi<Dashboard>(`/outreach/dashboard?${asked}`);
  const period = `from=${data.from}&to=${data.to}`;
  // The chart follows the figures shown, so it has no line the page does not explain.
  const shownTrends = data.trends.filter((t) => ORDER.includes(t.metric));

  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle={`${longDay(data.from)} to ${longDay(data.to)}. Every number opens the list it was counted from.`}
      />

      <form action="/outreach" className="mb-5 flex flex-wrap items-end gap-2">
        {presets.map((p) => {
          const active = p.from === data.from && p.to === data.to;
          return (
            <Link
              key={p.label}
              href={`/outreach?from=${p.from}&to=${p.to}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px]',
                active
                  ? 'border-accent-br bg-chip text-fg'
                  : 'border-border text-fg2 hover:bg-hover',
              )}
            >
              {p.label}
            </Link>
          );
        })}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <label className="flex flex-col gap-1 text-[11.5px] text-fg3">
          From
          <input
            type="date"
            name="from"
            defaultValue={data.from}
            className="h-8 rounded-[7px] border border-border bg-input px-2 text-[12px] text-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] text-fg3">
          To
          <input
            type="date"
            name="to"
            max={today}
            defaultValue={data.to}
            className="h-8 rounded-[7px] border border-border bg-input px-2 text-[12px] text-fg"
          />
        </label>
        <button
          type="submit"
          className="h-8 rounded-[7px] border border-border px-3 text-[12px] text-fg hover:bg-hover"
        >
          Show
        </button>
      </form>

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {ORDER.filter((key) => data.figures[key]).map((key) => {
          const f = data.figures[key]!;
          return (
            <li key={key}>
              <Link
                href={`/outreach/figures/${key}?${period}`}
                className="flex h-full flex-col gap-1.5 rounded-[14px] border border-border bg-surface p-4 hover:border-accent-br"
              >
                <span className="text-[12.5px] font-medium text-fg2">{f.label}</span>
                <span className="text-[30px] leading-tight font-semibold text-fg tabular-nums">
                  {f.of === null
                    ? f.value.toLocaleString('en-GB')
                    : f.of
                      ? `${Math.round((f.value / f.of) * 100)}%`
                      : '—'}
                </span>
                <span className="text-[11px] text-fg3">
                  {f.of !== null ? `${f.value} of ${f.of} marked · ` : ''}
                  {f.now ? 'now' : f.hint}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="mt-7 rounded-[10px] border border-border bg-surface p-4">
        <h2 className="mb-3 text-[13px] font-semibold text-fg">By week</h2>
        <LineChart
          series={shownTrends.map((t) => ({ metric: t.metric, points: t.points }))}
          labels={Object.fromEntries(shownTrends.map((t) => [t.metric, t.label]))}
        />
      </section>
    </>
  );
}

/** This week, this month and this year so far, in church time. */
function periods(today: string) {
  const d = new Date(`${today}T12:00:00Z`);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return [
    { label: 'This week', from: monday.toISOString().slice(0, 10), to: today },
    { label: 'This month', from: `${today.slice(0, 8)}01`, to: today },
    { label: 'This year', from: `${today.slice(0, 5)}01-01`, to: today },
  ];
}

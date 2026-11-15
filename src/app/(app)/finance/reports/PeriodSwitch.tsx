'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

export type ReportKind = 'day' | 'week' | 'month' | 'year' | 'custom' | 'position' | 'months';

const TABS: { kind: ReportKind; label: string }[] = [
  { kind: 'day', label: 'Day' },
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'year', label: 'Year' },
  { kind: 'custom', label: 'Custom' },
  { kind: 'position', label: 'Position' },
  { kind: 'months', label: 'Finance report' },
];

/** The period switch and its date. Everything lives in the URL, so a report can be sent as a link. */
export function PeriodSwitch({
  kind,
  date,
  from,
  to,
  today,
  months,
}: {
  kind: ReportKind;
  date: string;
  from: string;
  to: string;
  today: string;
  /** The finance report's first and last month, "2026-05". */
  months: { from: string; to: string };
}) {
  const router = useRouter();
  const go = (params: Record<string, string>) =>
    router.replace(`/finance/reports?${new URLSearchParams(params)}`, { scroll: false });

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[16px] border border-border bg-surface p-4">
      <nav
        aria-label="Report"
        className="flex flex-wrap rounded-full border border-border bg-surface2 p-0.5"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.kind}
            href={`/finance/reports?${new URLSearchParams(
              tab.kind === 'custom'
                ? { kind: 'custom', from, to }
                : tab.kind === 'months'
                  ? { kind: 'months', from: months.from, to: months.to }
                  : { kind: tab.kind, date },
            )}`}
            aria-current={tab.kind === kind ? 'page' : undefined}
            scroll={false}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12.5px]',
              tab.kind === kind
                ? 'bg-surface font-medium text-fg shadow-sm'
                : 'text-fg2 hover:text-fg',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {kind === 'months' ? (
        <>
          <Input
            label="From the month"
            type="month"
            value={months.from}
            max={months.to}
            onChange={(e) => e.target.value && go({ kind, from: e.target.value, to: months.to })}
          />
          <Input
            label="To the month"
            type="month"
            value={months.to}
            min={months.from}
            max={today.slice(0, 7)}
            onChange={(e) => e.target.value && go({ kind, from: months.from, to: e.target.value })}
          />
          <p className="pb-2 text-[12px] text-fg3">Up to 12 months, a ledger for each.</p>
        </>
      ) : kind === 'custom' ? (
        <>
          <Input
            label="From"
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && go({ kind, from: e.target.value, to })}
          />
          <Input
            label="To"
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && go({ kind, from, to: e.target.value })}
          />
        </>
      ) : (
        <Input
          label={
            kind === 'position'
              ? 'As at the end of'
              : kind === 'day'
                ? 'Day'
                : `A day in the ${kind}`
          }
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && go({ kind, date: e.target.value })}
        />
      )}
    </div>
  );
}

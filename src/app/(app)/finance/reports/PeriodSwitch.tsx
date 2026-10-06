'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

export type ReportKind = 'day' | 'week' | 'month' | 'year' | 'custom' | 'position';

const TABS: { kind: ReportKind; label: string }[] = [
  { kind: 'day', label: 'Day' },
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'year', label: 'Year' },
  { kind: 'custom', label: 'Custom' },
  { kind: 'position', label: 'Position' },
];

/** The period switch and its date. Everything lives in the URL, so a report can be sent as a link. */
export function PeriodSwitch({
  kind,
  date,
  from,
  to,
  today,
}: {
  kind: ReportKind;
  date: string;
  from: string;
  to: string;
  today: string;
}) {
  const router = useRouter();
  const go = (params: Record<string, string>) =>
    router.replace(`/finance/reports?${new URLSearchParams(params)}`, { scroll: false });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <nav aria-label="Report" className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.kind}
            href={`/finance/reports?${new URLSearchParams(
              tab.kind === 'custom' ? { kind: 'custom', from, to } : { kind: tab.kind, date },
            )}`}
            aria-current={tab.kind === kind ? 'page' : undefined}
            scroll={false}
            className={cn(
              'h-9 rounded-[7px] border px-3 text-[12.5px] leading-9 font-medium',
              tab.kind === kind
                ? 'border-accent-br bg-chip text-accent'
                : 'border-border text-fg2 hover:bg-hover',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {kind === 'custom' ? (
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

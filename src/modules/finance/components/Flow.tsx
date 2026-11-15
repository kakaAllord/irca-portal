import { cn } from '@/lib/cn';

/** Money in or out for the month, and how it compares with the month before. */
export function Flow({
  label,
  value,
  change,
  good,
  tone,
  against = 'last month',
}: {
  label: string;
  value: string;
  change: number | null;
  /** Which way is good news: more income, or fewer expenses. */
  good: 'up' | 'down';
  tone: 'in' | 'out';
  /** What it is compared with, after "on". */
  against?: string;
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
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% on {against}
          </span>
        )}
      </span>
    </div>
  );
}

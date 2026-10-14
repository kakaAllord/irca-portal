import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/shared';
import { cn } from '@/lib/cn';

export const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** A link when there is somewhere to go, a plain box when there is not. */
function Wrap({
  href,
  children,
  ...rest
}: {
  href?: string;
  children: ReactNode;
  title: string;
  'aria-label': string;
  className: string;
}) {
  return href ? (
    <Link href={href} {...rest}>
      {children}
    </Link>
  ) : (
    <div {...rest}>{children}</div>
  );
}

export function Trend({
  rows,
  currency,
  current,
  href = (month) => `/finance?month=${month}`,
}: {
  rows: { month: string; income: string; expense: string }[];
  currency: string;
  current: string;
  /** Where a month links to; none, and it is plain. */
  href?: (month: string) => string | undefined;
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
          <Wrap
            key={row.month}
            href={href(row.month)}
            title={label}
            aria-label={label}
            className={cn(
              'flex min-w-[44px] flex-1 flex-col items-center gap-1.5 rounded-[10px] px-1 pt-2 pb-1.5',
              href(row.month) && 'hover:bg-hover',
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
          </Wrap>
        );
      })}
    </div>
  );
}

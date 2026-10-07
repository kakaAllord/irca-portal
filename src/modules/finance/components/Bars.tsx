import { formatMoney } from '@/shared';
import { cn } from '@/lib/cn';

/**
 * A share of a total as a bar, green for money in and clay for money out.
 * CSS, not a charting library: a name, a figure and a rectangle each do not
 * need 40kB of JavaScript.
 */
export function Bars({
  rows,
  currency,
  tone,
  empty = 'Nothing recorded this month.',
}: {
  rows: { id: string; name: string; total: string; share: number }[];
  currency: string;
  tone: 'in' | 'out';
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[12.5px] text-fg3">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate text-fg">{row.name}</span>
            <span className="flex-none tabular-nums text-fg">
              {formatMoney(row.total, currency)}
              <span className="ml-1.5 text-[11px] text-fg3">{row.share}%</span>
            </span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-chip" aria-hidden="true">
            <span
              className={cn('block h-full rounded-full', tone === 'in' ? 'bg-pos' : 'bg-[#b4532a]')}
              style={{ width: `${Math.max(row.share, 2)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

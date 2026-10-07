import { cn } from '@/lib/cn';

/** Series colours, in order, never cycled past five (globals.css says why). */
const SERIES = [
  'text-series-1',
  'text-series-2',
  'text-series-3',
  'text-series-4',
  'text-series-5',
];
const SWATCH = ['bg-series-1', 'bg-series-2', 'bg-series-3', 'bg-series-4', 'bg-series-5'];

export type Slice = { label: string; value: number; share: number };

const R = 15.9155; // a circumference of 100, so lengths are per cent
const GAP = 0.8; // the surface showing between slices

/**
 * A whole, in up to five slices. The legend beside it names every slice with
 * its count and share, so no slice is told by colour alone; pointing at a
 * slice names it too, and the numbers are one click away as a table.
 *
 * More than five answers fold the smallest into one "All the rest" slice
 * rather than reaching for a sixth colour.
 */
export function DonutChart({
  slices: all,
  name,
  order = 'given',
}: {
  slices: Slice[];
  /** What one slice counts, for the table's heading. */
  name: string;
  /** "given" keeps an order that means something, such as age. */
  order?: 'given' | 'biggest';
}) {
  if (!all.length) return <p className="text-[12.5px] text-fg3">No answers yet.</p>;

  const sorted = order === 'biggest' ? [...all].sort((a, b) => b.value - a.value) : all;
  const slices: Slice[] =
    sorted.length > SERIES.length
      ? [
          ...sorted.slice(0, SERIES.length - 1),
          {
            label: `All the rest (${sorted.length - SERIES.length + 1})`,
            value: sorted.slice(SERIES.length - 1).reduce((sum, s) => sum + s.value, 0),
            share: sorted.slice(SERIES.length - 1).reduce((sum, s) => sum + s.share, 0),
          },
        ]
      : sorted;
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const many = slices.length > 1;

  let start = 0;
  const arcs = slices.map((s, i) => {
    const length = (s.value / total) * 100;
    const arc = { ...s, i, start, length: Math.max(length - (many ? GAP : 0), 0) };
    start += length;
    return arc;
  });

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <svg
          viewBox="0 0 42 42"
          className="size-36 flex-none -rotate-90"
          role="img"
          aria-label={`${name}: ${slices.map((s) => `${s.label} ${s.value} (${s.share}%)`).join(', ')}`}
        >
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${a.length} ${100 - a.length}`}
              strokeDashoffset={-a.start}
              className={cn(SERIES[a.i], 'transition-opacity hover:opacity-80')}
            >
              <title>{`${a.label}: ${a.value.toLocaleString('en-GB')} (${a.share}%)`}</title>
            </circle>
          ))}
        </svg>

        <ul className="flex w-full min-w-0 flex-col gap-1.5">
          {slices.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 text-[12.5px]">
              <span
                aria-hidden="true"
                className={cn('size-2.5 flex-none rounded-[3px]', SWATCH[i])}
              />
              <span className="min-w-0 flex-1 truncate text-fg2" title={s.label}>
                {s.label}
              </span>
              <span className="tabular-nums text-fg">
                {s.value.toLocaleString('en-GB')} <span className="text-fg3">· {s.share}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details className="text-[11.5px] text-fg3">
        <summary className="w-fit cursor-pointer hover:text-fg2">Show as a table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-[8px] border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-thead">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Answer
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                  {name}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.label} className="border-t border-border2 text-fg2">
                  <td className="px-2 py-1">{s.label}</td>
                  <td className="px-2 py-1 text-right">
                    {s.value.toLocaleString('en-GB')} · {s.share}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

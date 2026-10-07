import { cn } from '@/lib/cn';

/** Room above the tallest column for its number and note. */
const CAP = 30;

export type Column = {
  label: string;
  value: number;
  /** Its share of the whole, in per cent, said beside the value where there is room. */
  share?: number;
  /** The lines shown on hover and focus, under the label. */
  detail?: string[];
  /** Picked out from the rest, with a note under its cap. */
  note?: string;
};

/**
 * One series as columns on a shared baseline, drawn in HTML so long answers
 * wrap under their column. Each cap says its number, pointing at or tabbing to
 * a column says the rest, and the same numbers are one click away as a table,
 * so nothing is told by colour or by hovering alone.
 *
 * More than `limit` answers fold their tail rather than squeezing columns past
 * reading: into one "Others" column, or, where the tail together would dwarf
 * every column shown (thirty wards of a few people each), into a line under
 * the chart.
 */
export function ColumnChart({
  columns: all,
  name,
  limit = 8,
  height = 150,
  table = true,
  fold = 'column',
}: {
  columns: Column[];
  /** What one column counts, for the table's heading and the chart's label. */
  name: string;
  limit?: number;
  height?: number;
  /** False where a fuller table already sits beside the chart. */
  table?: boolean;
  fold?: 'column' | 'note';
}) {
  if (!all.length) return <p className="text-[12.5px] text-fg3">No answers yet.</p>;

  const number = (c: Column) =>
    c.share === undefined
      ? c.value.toLocaleString('en-GB')
      : `${c.value.toLocaleString('en-GB')} · ${c.share}%`;
  const folded = all.length > limit;
  const shown = folded && fold === 'note' ? limit : limit - 1;
  const tail = folded ? all.slice(shown) : [];
  const tailTotal = tail.reduce((sum, c) => sum + c.value, 0);
  const columns: Column[] = !folded
    ? all
    : fold === 'note'
      ? all.slice(0, shown)
      : [
          ...all.slice(0, shown),
          {
            label: `Others (${tail.length})`,
            value: tailTotal,
            share: tail.every((c) => c.share !== undefined)
              ? tail.reduce((sum, c) => sum + c.share!, 0)
              : undefined,
            detail: tail.map((c) => `${c.label}: ${number(c)}`),
          },
        ];
  const max = Math.max(1, ...columns.map((c) => c.value));
  const ticks = [0.5, 1].map((f) => Math.round(max * f));

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        {/* Two hairlines, at half and at the top, over the columns' own band. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0"
          style={{ top: CAP, height }}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border2"
              style={{ bottom: `${(t / max) * 100}%` }}
            >
              <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] tabular-nums text-fg3">
                {t.toLocaleString('en-GB')}
              </span>
            </div>
          ))}
        </div>

        <ul aria-label={name} className="relative flex items-stretch gap-0.5 pr-7">
          {columns.map((c, i) => {
            const cap = number(c);
            return (
              <li
                key={c.label}
                tabIndex={0}
                aria-label={[`${c.label}: ${cap}`, c.note, ...(c.detail ?? [])]
                  .filter(Boolean)
                  .join('. ')}
                className="group relative flex min-w-0 flex-1 flex-col items-center rounded-[6px] outline-none hover:bg-hover focus-visible:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span
                  aria-hidden="true"
                  className="flex w-full flex-col items-center justify-end"
                  style={{ height: height + CAP, paddingTop: CAP }}
                >
                  <span
                    className={cn(
                      'relative block w-[min(24px,70%)] rounded-t-[4px] bg-series-1',
                      c.note && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                    )}
                    style={{ height: c.value ? Math.max((c.value / max) * height, 2) : 0 }}
                  >
                    <span className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center text-[11px] leading-tight whitespace-nowrap tabular-nums text-fg">
                      {c.note && <span className="text-[10px] font-medium text-fg2">{c.note}</span>}
                      <span>
                        {c.value.toLocaleString('en-GB')}
                        {/* On a phone the share waits in the tooltip and the table. */}
                        {c.share !== undefined && (
                          <span className="hidden sm:inline"> · {c.share}%</span>
                        )}
                      </span>
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="w-full border-t border-border px-0.5 pt-1.5 pb-1 text-center text-[10.5px] leading-tight break-words hyphens-auto text-fg2"
                >
                  {c.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none invisible absolute bottom-full z-30 mb-1 w-max max-w-56',
                    // Kept inside the chart at either end.
                    i === 0
                      ? 'left-0'
                      : i === columns.length - 1
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2',
                    'rounded-[6px] bg-btn-bg px-2 py-1.5 text-[11px] text-btn-fg shadow-md',
                    'opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100',
                  )}
                >
                  <span className="block font-semibold">{c.label}</span>
                  <span className="block tabular-nums">{cap}</span>
                  {c.detail?.map((line) => (
                    <span key={line} className="block tabular-nums opacity-80">
                      {line}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {folded && fold === 'note' && (
        <figcaption className="text-[11.5px] text-fg3">
          And {tail.length} more, {tailTotal.toLocaleString('en-GB')} in all
          {table && ', each in the table'}.
        </figcaption>
      )}

      {table && (
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
                {all.map((c) => (
                  <tr key={c.label} className="border-t border-border2 text-fg2">
                    <td className="px-2 py-1">{c.label}</td>
                    <td className="px-2 py-1 text-right">{number(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

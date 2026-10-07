import { cn } from '@/lib/cn';

/** A label and what they said; empty when they have not said it. */
export type Fact = readonly [label: string, value: string | null | undefined];

/**
 * What someone told the church, without a column of dashes: the details they
 * gave, in full, and the ones still missing gathered into one quiet line, so
 * the office sees at a glance what to ask next time.
 */
export function Facts({
  facts,
  layout = 'rows',
  className,
}: {
  facts: readonly Fact[];
  /** rows: label beside value; stacked: label above value, two to a row. */
  layout?: 'rows' | 'stacked';
  className?: string;
}) {
  const given = facts.filter((f): f is readonly [string, string] => !!f[1]?.trim());
  const missing = facts.filter((f) => !f[1]?.trim()).map((f) => f[0]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {given.length === 0 ? (
        <p className="text-[12.5px] text-fg3">Nothing given yet.</p>
      ) : layout === 'rows' ? (
        <dl className="grid grid-cols-[minmax(96px,150px)_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          {given.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-fg3">{label}</dt>
              <dd className="min-w-0 break-words text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-2.5">
          {given.map(([label, value]) => (
            // A long answer (an email, a list) takes the whole row rather than
            // breaking mid-word in half of it.
            <div
              key={label}
              className={cn('flex min-w-0 flex-col', value.length > 22 && 'col-span-2')}
            >
              <dt className="text-[10.5px] font-semibold tracking-wide text-fg3 uppercase">
                {label}
              </dt>
              <dd className="break-words text-[12.5px] text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {missing.length > 0 && given.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-fg3">
          <span>Not given yet:</span>
          {missing.map((label) => (
            <span
              key={label}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-fg2"
            >
              {label}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

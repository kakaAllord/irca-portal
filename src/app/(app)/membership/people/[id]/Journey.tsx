import { cn } from '@/lib/cn';
import { STAGE_LABEL, STAGE_ORDER, day, type PersonDetail } from '@/modules/membership/types';

/**
 * The road from visitor to member as steps, the ones behind them filled and
 * dated from their moves, the one they are on marked. Who moved them, and
 * why, is on hover; a move back keeps the latest date for each stage.
 */
export function Journey({
  stage,
  history,
}: {
  stage: PersonDetail['stage'];
  history: PersonDetail['history'];
}) {
  const at = STAGE_ORDER.indexOf(stage);
  const reached = new Map<string, PersonDetail['history'][number]>();
  for (const move of history) if (!reached.has(move.to)) reached.set(move.to, move);

  return (
    <ol aria-label="Their journey" className="flex overflow-x-auto pb-1">
      {STAGE_ORDER.map((key, i) => {
        const done = i < at;
        const here = i === at;
        const move = reached.get(key);
        return (
          <li
            key={key}
            aria-current={here ? 'step' : undefined}
            title={move ? `${move.by}${move.note ? `: ${move.note}` : ''}` : undefined}
            className="relative flex min-w-[118px] flex-1 flex-col items-start gap-1.5 pr-3"
          >
            {/* The line to the next step, behind the dots. */}
            {i < STAGE_ORDER.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-[9px] left-5 h-0.5 w-[calc(100%-20px)]',
                  done ? 'bg-accent' : 'bg-border',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-5 items-center justify-center rounded-full border-2',
                done && 'border-accent bg-accent text-accent-ink',
                here && 'border-accent bg-surface',
                !done && !here && 'border-border bg-surface',
              )}
            >
              {done ? (
                <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor">
                  <path d="M2.5 6.2 5 8.5l4.5-5" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                here && <span className="size-2 rounded-full bg-accent" />
              )}
            </span>
            <span
              className={cn(
                'text-[12px] leading-tight',
                here ? 'font-semibold text-fg' : done ? 'text-fg2' : 'text-fg3',
              )}
            >
              {STAGE_LABEL[key]}
            </span>
            <span className="text-[11px] text-fg3 tabular-nums">
              {move ? day(move.at) : here ? 'Now' : ' '}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

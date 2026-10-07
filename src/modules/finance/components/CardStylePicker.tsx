'use client';

import { CARD_STYLES, type CardStyle } from '@/shared';
import { cn } from '@/lib/cn';
import { CARD_STYLE, faceBackground } from './BankCard';

/**
 * The four card templates as small cards to choose from, the chosen one
 * ringed and ticked. A radio group underneath, so the arrow keys move
 * between them as between any set of options.
 */
export function CardStylePicker({
  value,
  onChange,
  name,
}: {
  value: CardStyle;
  onChange: (style: CardStyle) => void;
  /** The account's name, printed on each sample so the choice is concrete. */
  name: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[12.5px] font-medium text-fg">Card colour</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARD_STYLES.map((style) => {
          const face = CARD_STYLE[style];
          const chosen = style === value;
          return (
            <label key={style} className="group flex cursor-pointer flex-col items-center gap-1.5">
              <input
                type="radio"
                name="card-style"
                value={style}
                checked={chosen}
                onChange={() => onChange(style)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-[10px] p-2 text-white shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)] ring-offset-2 ring-offset-surface transition-transform group-hover:-translate-y-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
                  chosen && 'ring-2 ring-accent',
                )}
                style={{ backgroundImage: faceBackground(face) }}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-3.5 rounded-[3px] bg-[linear-gradient(135deg,#f6e2a6,#d4a94f,#a87b2b)]"
                />
                <span className="truncate text-[8.5px] font-semibold tracking-[0.12em] uppercase opacity-90">
                  {name.trim() || 'Account'}
                </span>
                {chosen && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#111]"
                  >
                    ✓
                  </span>
                )}
              </span>
              <span className={cn('text-[11.5px]', chosen ? 'font-medium text-fg' : 'text-fg3')}>
                {face.name}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

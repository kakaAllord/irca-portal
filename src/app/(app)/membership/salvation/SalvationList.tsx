'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { useCan } from '@/lib/session';
import { cn } from '@/lib/cn';
import { labelOf } from '@/shared/registration';
import { day, type PersonRow } from '@/modules/membership/types';

export type Need = 'salvation' | 'baptism';

const FLAG = { salvation: 'saved', baptism: 'baptised' } as const;
const WORD = { salvation: 'Saved', baptism: 'Baptised' } as const;
/** The form's answer each list is about, shown first among what they chose. */
const ASKED = { salvation: 'Salvation', baptism: 'Baptism' } as const;

type Moved = { id: string; name: string; before: boolean | null };

/**
 * The two lists, one person a line, with one switch each. Flipping it marks
 * them saved (they move to Need baptism) or baptised (they leave the list).
 * A bar at the bottom says where they went, with Undo, because a wrong tap
 * on a phone should cost nothing.
 */
export function SalvationList({ rows, need }: { rows: PersonRow[]; need: Need }) {
  const router = useRouter();
  const can = useCan();
  const editable = can('membership.people.update');
  const [hidden, setHidden] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [moved, setMoved] = useState<Moved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flag = FLAG[need];

  // The bar goes away by itself after a while.
  useEffect(() => {
    if (!moved) return;
    const timer = setTimeout(() => setMoved(null), 10_000);
    return () => clearTimeout(timer);
  }, [moved]);

  const shown = rows.filter((p) => !hidden.includes(p.id));
  const unhide = (id: string) => setHidden((all) => all.filter((x) => x !== id));

  async function flip(person: PersonRow) {
    const name = person.fullName || 'Someone';
    // What the office had said before, so Undo puts back exactly that.
    const was = person[flag];
    const before = was.source === 'office' ? was.value : null;
    setBusy(person.id);
    setError(null);
    setHidden((all) => [...all, person.id]);
    try {
      await clientApi(`/membership/people/${person.id}/${flag}`, {
        method: 'POST',
        body: { value: true },
      });
      setMoved({ id: person.id, name, before });
      router.refresh();
    } catch {
      unhide(person.id);
      setError(`${name} could not be marked ${WORD[need].toLowerCase()}. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  async function undo() {
    if (!moved) return;
    const { id, name, before } = moved;
    setMoved(null);
    try {
      await clientApi(`/membership/people/${id}/${flag}`, {
        method: 'POST',
        body: { value: before },
      });
      unhide(id);
      router.refresh();
    } catch {
      setError(`Could not undo for ${name}. Open their record to change it.`);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface px-4 py-10 text-center text-[13px] text-fg2">
          {need === 'salvation'
            ? 'Nobody is waiting for salvation.'
            : 'Nobody is waiting for baptism.'}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border2 overflow-hidden rounded-[10px] border border-border bg-surface">
          {shown.map((person) => {
            const name = person.fullName || 'Unknown';
            // What they asked for comes first: it is why they are on this list.
            const chose = [...person.interestedIn].sort(
              (a, b) => Number(b === ASKED[need]) - Number(a === ASKED[need]),
            );
            return (
              <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex size-8 flex-none items-center justify-center rounded-full bg-chip text-[11.5px] font-semibold text-fg2"
                >
                  {person.initials}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/membership/people/${person.id}`}
                    className="truncate text-[13px] font-medium text-fg hover:underline"
                  >
                    {name}
                  </Link>
                  <span className="text-[11.5px] text-fg3">
                    {[
                      person.phone || 'No phone',
                      `Registered ${day(person.registeredAt)}`,
                      need === 'baptism' && person.saved.value ? 'Saved' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {chose.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {chose.map((value) => (
                        <span
                          key={value}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px]',
                            value === ASKED[need]
                              ? 'border border-accent-br bg-chip text-fg'
                              : 'border border-transparent bg-chip text-fg2',
                          )}
                        >
                          {labelOf('interest', value, 'en')}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                {editable && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={busy === person.id}
                    aria-label={`${name} is ${WORD[need].toLowerCase()}`}
                    disabled={busy !== null}
                    onClick={() => flip(person)}
                    className="flex flex-none items-center gap-2 rounded-full py-1 pr-1 pl-2.5 text-[12px] font-medium text-fg2 hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                  >
                    {WORD[need]}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors',
                        busy === person.id ? 'bg-pos' : 'bg-border',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-4 rounded-full bg-surface shadow transition-[left]',
                          busy === person.id ? 'left-[18px]' : 'left-0.5',
                        )}
                      />
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {moved && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))]"
        >
          <div className="flex max-w-full items-center gap-3 rounded-[10px] bg-fg px-4 py-2.5 text-[12.5px] text-bg shadow-lg">
            <span className="min-w-0">
              {need === 'salvation'
                ? `${moved.name} is saved, and moved to Need baptism.`
                : `${moved.name} is baptised, and off the list.`}
            </span>
            <button
              type="button"
              onClick={undo}
              className="flex-none font-semibold underline underline-offset-2"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setMoved(null)}
              aria-label="Close"
              className="flex-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

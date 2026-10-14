'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { useCan } from '@/lib/session';
import { cn } from '@/lib/cn';
import { flagLabel, type Flag } from '../types';

/**
 * Saved and baptised as two plain statuses. Not marked: a grey tile that says
 * so, with a solid button naming the action. Marked: the tile turns green with
 * a tick, at once, and a small Undo. The line under the status says where the
 * answer came from, because "said on the form" and "confirmed by Pastor
 * Sarah" are not the same fact.
 */
export function SpiritualPills({
  personId,
  saved,
  baptised,
  savedBy,
  baptisedBy,
}: {
  personId: string;
  saved: Flag;
  baptised: Flag;
  savedBy?: string | null;
  baptisedBy?: string | null;
}) {
  const router = useRouter();
  const can = useCan();
  const editable = can('membership.people.update');
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState({ saved: saved.value, baptised: baptised.value });
  const [failed, setFailed] = useState(false);

  // Follow the server when the record is refreshed.
  useEffect(
    () => setShown({ saved: saved.value, baptised: baptised.value }),
    [saved.value, baptised.value],
  );

  async function set(flag: 'saved' | 'baptised', value: boolean) {
    setBusy(flag);
    setFailed(false);
    setShown((s) => ({ ...s, [flag]: value }));
    try {
      await clientApi(`/membership/people/${personId}/${flag}`, {
        method: 'POST',
        body: { value },
      });
      router.refresh();
    } catch {
      setShown((s) => ({ ...s, [flag]: !value }));
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const tile = (
    flag: 'saved' | 'baptised',
    state: Flag,
    by: string | null | undefined,
    word: string,
    action: string,
  ) => {
    const on = shown[flag];
    const source = on === state.value ? flagLabel(state, by ?? null, word) : null;
    return (
      <div
        className={cn(
          'flex min-w-[210px] flex-1 flex-col gap-2 rounded-[10px] border p-3',
          on ? 'border-pos-br bg-pos-bg' : 'border-border bg-surface2',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-5 flex-none items-center justify-center rounded-full text-[12px] font-bold',
              on ? 'bg-pos text-accent-ink' : 'border border-border text-fg3',
            )}
          >
            {on ? '✓' : ''}
          </span>
          <span className={cn('text-[13px] font-semibold', on ? 'text-pos' : 'text-fg')}>
            {on ? word : `Not ${word.toLowerCase()} yet`}
          </span>
        </div>
        {source && on && <p className="text-[11.5px] text-fg2">{source}</p>}
        {editable &&
          (on ? (
            <button
              type="button"
              disabled={busy === flag}
              onClick={() => set(flag, false)}
              className="self-start text-[11.5px] text-fg3 underline hover:text-fg2 disabled:opacity-60"
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              disabled={busy === flag}
              onClick={() => set(flag, true)}
              className="self-start rounded-[7px] bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
            >
              {action}
            </button>
          ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tile('saved', saved, savedBy, 'Saved', 'Mark as saved')}
        {tile('baptised', baptised, baptisedBy, 'Baptised', 'Mark as baptised')}
      </div>
      {failed && <p className="text-[11.5px] text-danger">That did not save. Try again.</p>}
    </div>
  );
}

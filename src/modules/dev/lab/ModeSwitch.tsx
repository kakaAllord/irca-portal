'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { useCan } from '@/lib/session';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/cn';
import { LAB_MODES, type LabMode, type LabOverview } from './types';

/**
 * The one switch for where the whole app sends email and texts. It changes
 * the real behaviour at once for every email and every text, and the change
 * is written to the activity log.
 */
export function ModeSwitch({ overview }: { overview: LabOverview }) {
  const router = useRouter();
  const canChange = useCan()('dev.lab.manage');
  const [mode, setMode] = useState<LabMode>(overview.mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: LabMode) {
    if (next === mode || busy) return;
    const before = mode;
    setMode(next);
    setBusy(true);
    setError(null);
    try {
      await clientApi('/dev/lab/mode', { method: 'PUT', body: { mode: next } });
      router.refresh();
    } catch (err) {
      setMode(before);
      setError(err instanceof ApiRequestError ? err.message : 'It did not change.');
    } finally {
      setBusy(false);
    }
  }

  const says = LAB_MODES.find((m) => m.key === mode)!.says;
  const nothingLive = !overview.live.email && !overview.live.sms;

  return (
    <section
      aria-label="Where the app sends"
      className="rounded-[10px] border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-fg">Where the app sends</h2>
          <p className="mt-0.5 text-[11.5px] text-fg3">
            For every email and every text, from every page and every job.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Where the app sends"
          className="inline-flex rounded-[9px] border border-border bg-chip p-0.5"
        >
          {LAB_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={mode === m.key}
              disabled={!canChange || busy}
              onClick={() => choose(m.key)}
              className={cn(
                'rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium disabled:cursor-not-allowed',
                mode === m.key
                  ? 'bg-surface text-fg shadow-sm'
                  : 'text-fg2 hover:text-fg disabled:hover:text-fg2',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-fg2">{says}</p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-fg3">
        <li>Email: {overview.live.email ? 'an account is saved' : 'no account saved yet'}</li>
        <li>
          Texts:{' '}
          {overview.live.sms ? 'a Beem account is saved and texts are on' : 'no live texts yet'}
        </li>
      </ul>
      {nothingLive && mode !== 'lab' && (
        <p className="mt-2 text-[11.5px] text-fg3">
          With no live account, every message stays here whichever you choose. Save the accounts in
          Dev → Settings when you have the keys; this page keeps working after that.
        </p>
      )}
      {!canChange && (
        <p className="mt-2 text-[11.5px] text-fg3">You can read this, but not change it.</p>
      )}
      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </section>
  );
}

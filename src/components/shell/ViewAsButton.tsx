'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';

/**
 * An arrow out of a box: see the portal exactly as this person does,
 * read-only (D36). Shown only where the API has said this viewer may view as
 * them, so the page never guesses. The page it was pressed on is kept, and
 * the viewing bar's way back returns to it.
 */
export function ViewAsButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = `View as ${name}`;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await clientApi('/impersonation', { method: 'POST', body: { subjectUserId: userId } });
      sessionStorage.setItem('irca_return_to', window.location.pathname + window.location.search);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not start viewing.');
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        aria-label={label}
        title={`${label}. Read-only; they are not told.`}
        className="grid h-7 w-7 place-items-center rounded-[6px] border border-border text-fg2 hover:bg-hover hover:text-fg disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4h6v6" />
          <path d="M20 4 11 13" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </button>
      {error && <span className="text-[11.5px] text-danger">{error}</span>}
    </span>
  );
}

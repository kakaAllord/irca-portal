'use client';

import { useEffect, useRef, useState } from 'react';

/** Where the failure happened, in the words the person reads. */
export type FailedWhere = 'page' | 'browser' | 'api';

const WHERE: Record<FailedWhere, string> = {
  page: 'The server could not build this page.',
  browser: 'The page stopped working in your browser.',
  api: 'The server could not do what the page asked.',
};

/** The error a boundary was handed, as it may arrive from the server or the browser. */
export type BoundaryError = Error & {
  digest?: string;
  requestId?: string | null;
  status?: number;
  code?: string;
};

/**
 * The one reference to read out when something failed, and which kind of
 * failure it was (docs/plan/11, step 11.4).
 *
 * A page the server could not build shows Next's digest, which the portal's
 * server has already sent to the API. A request the API failed shows the
 * API's request id, which it keeps. Anything else failed in the browser: a
 * reference is made up here and sent, once, so the developer can find it
 * too. Either way what is shown is what Dev → Errors looks up.
 */
export function useErrorReference(error: BoundaryError): { reference: string; where: FailedWhere } {
  const [made] = useState(() => `B${Math.floor(1e9 + Math.random() * 9e9)}`);
  const sent = useRef(false);

  const fromApi = typeof error.requestId === 'string' && error.requestId.length > 0;
  const where: FailedWhere = error.digest ? 'page' : fromApi ? 'api' : 'browser';
  const reference = error.digest ?? (fromApi ? error.requestId! : made);
  // The API keeps its own 500s; everything else is sent from here.
  const send = !error.digest && !(fromApi && (error.status ?? 500) >= 500);

  useEffect(() => {
    if (!send || sent.current) return;
    sent.current = true;
    void fetch('/api/errors', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-irca-client': 'portal' },
      body: JSON.stringify({
        source: 'browser',
        reference,
        message: `${error.name}: ${error.message}`.slice(0, 2_000),
        stack: error.stack?.slice(0, 20_000),
        path: window.location.pathname + window.location.search,
        requestId: fromApi ? error.requestId : undefined,
        status: error.status,
        code: error.code,
      }),
    }).catch(() => {
      // Signed out, or the API is down: the reference is still on screen.
    });
  }, [send, reference, error, fromApi]);

  return { reference, where };
}

/**
 * The reference in a chip, a Copy button, the time, and what to do with it.
 * Used by every error page, so the words are the same everywhere.
 */
export function ErrorReference({ reference, where }: { reference: string; where: FailedWhere }) {
  const [copied, setCopied] = useState(false);
  const [at] = useState(() => new Date());
  const code = useRef<HTMLElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // No clipboard (an old phone, a page not served over https): select it
      // so a long press copies it.
      const range = document.createRange();
      if (code.current) range.selectNodeContents(code.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  return (
    <div className="mt-3 text-[12.5px] text-fg2">
      <p>{WHERE[where]}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <code
          ref={code}
          className="rounded-[6px] border border-border bg-surface px-2.5 py-1 font-mono text-[13px] text-fg select-all"
          aria-label="Reference"
        >
          {reference}
        </code>
        <button
          type="button"
          onClick={() => void copy()}
          className="h-7 rounded-[6px] border border-border bg-surface px-2.5 text-[12px] text-fg hover:bg-hover"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-fg3">
        {at.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      <p className="mt-2">Send this to your developer. They can see exactly what happened.</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { useCan } from '@/lib/session';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shell/States';
import { RouteBadge } from './RouteBadge';
import type { LabChannel, LabMessage } from './types';

const REFRESH_MS = 4_000;

const when = (iso: string, timezone: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * Everything the system sent on one channel, newest first. Every one-time link
 * in the words is pulled out as its own line so it can be opened or copied,
 * which is the point: reading an invitation or a reset without an email account.
 */
export function LabInbox({
  channel,
  rows,
  next,
  timezone,
}: {
  channel: LabChannel;
  rows: LabMessage[];
  next: string | null;
  timezone: string;
}) {
  const router = useRouter();
  const canManage = useCan()('dev.lab.manage');
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const noun = channel === 'EMAIL' ? 'email' : 'text';

  // New messages appear while the page is open, so a test can be watched.
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, router]);

  async function clear() {
    if (!window.confirm(`Delete every ${noun} kept here? Nothing else is affected.`)) return;
    setError(null);
    try {
      await clientApi(`/dev/lab/messages?channel=${channel}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'It was not emptied.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[12.5px] text-fg2">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
            className="size-3.5"
          />
          Show new messages as they arrive
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => router.refresh()}>
            Refresh
          </Button>
          {canManage && rows.length > 0 && (
            <Button size="sm" variant="secondary" onClick={clear}>
              Empty
            </Button>
          )}
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {rows.length === 0 ? (
        <EmptyState title={`No ${noun}s kept yet.`}>
          {channel === 'EMAIL'
            ? 'Invite someone or ask for a password reset, and the email appears here.'
            : 'Send a message from Communications, and the text appears here.'}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((m) => (
            <li key={m.id}>
              <Message message={m} timezone={timezone} />
            </li>
          ))}
        </ul>
      )}

      {next && (
        <Link
          href={`/dev/lab/${channel === 'EMAIL' ? 'email' : 'sms'}?before=${encodeURIComponent(next)}`}
          className="self-start text-[12.5px] text-accent underline"
        >
          Older {noun}s →
        </Link>
      )}
    </div>
  );
}

function Message({ message: m, timezone }: { message: LabMessage; timezone: string }) {
  return (
    <article className="rounded-[10px] border border-border bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RouteBadge route={m.route} />
        <span className="text-[12.5px] font-medium text-fg">To {m.to}</span>
        {m.sender && <span className="text-[11.5px] text-fg3">from {m.sender}</span>}
        <time dateTime={m.at} className="ml-auto text-[11.5px] text-fg3">
          {when(m.at, timezone)}
        </time>
      </div>
      {m.subject && <h3 className="mt-2 text-[13px] font-semibold text-fg">{m.subject}</h3>}
      {m.links.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {m.links.map((link) => (
            <li key={link} className="flex flex-wrap items-center gap-2">
              <a
                href={link}
                className="max-w-full text-[12px] break-all text-accent underline"
                // A one-time link opened here is spent, so it opens only on purpose.
                target="_blank"
                rel="noreferrer"
              >
                {link}
              </a>
              <CopyButton text={link} />
            </li>
          ))}
        </ul>
      )}
      <pre className="mt-2.5 max-h-72 overflow-auto rounded-[8px] bg-chip p-2.5 font-sans text-[12.5px] leading-snug whitespace-pre-wrap text-fg2">
        {m.body}
      </pre>
      {m.note && <p className="mt-2 text-[11.5px] text-fg3">{m.note}</p>}
    </article>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1_500);
        } catch {
          // The link is on screen to select by hand.
        }
      }}
      className="rounded-[6px] border border-border px-2 py-0.5 text-[11px] text-fg2 hover:bg-hover"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

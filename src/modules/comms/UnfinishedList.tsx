'use client';

import { useRouter } from 'next/navigation';
import { RemindMenu } from './RemindMenu';

export type Unfinished = {
  personId: string | null;
  name: string | null;
  phone: string;
  lang: string;
  missing: string[];
  updatedAt: string;
  reminders: number;
  lastReminder: { at: string; channel: string; by: string | null } | null;
};

const CHANNEL: Record<string, string> = { COPY_LINK: 'link copied', WHATSAPP: 'WhatsApp' };

/** One row per person, with what they still have to fill in and the last reminder sent. */
export function UnfinishedList({ rows, timezone }: { rows: Unfinished[]; timezone: string }) {
  const router = useRouter();
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  return (
    <ul className="flex flex-col divide-y divide-border2 overflow-hidden rounded-[10px] border border-border bg-surface">
      {rows.map((r, i) => (
        <li
          key={r.personId ?? i}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
        >
          <div className="min-w-[200px] flex-1">
            <p className="text-[12.5px] font-medium text-fg">{r.name ?? 'No name yet'}</p>
            <p className="text-[11.5px] text-fg3">
              {r.phone} ·{' '}
              {r.missing.length ? `Missing ${r.missing.join(', ').toLowerCase()}` : 'Nearly there'}{' '}
              · last touched {when(r.updatedAt)}
            </p>
          </div>
          <p className="text-[11.5px] text-fg2">
            {r.lastReminder
              ? `Reminded ${when(r.lastReminder.at)} by ${r.lastReminder.by ?? 'someone'} (${CHANNEL[r.lastReminder.channel] ?? r.lastReminder.channel})${r.reminders > 1 ? `, ${r.reminders} times in all` : ''}`
              : 'Not reminded yet'}
          </p>
          {r.personId && <RemindMenu personId={r.personId} onSent={() => router.refresh()} />}
        </li>
      ))}
    </ul>
  );
}

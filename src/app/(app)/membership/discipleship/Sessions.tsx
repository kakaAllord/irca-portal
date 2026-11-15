'use client';

import { cn } from '@/lib/cn';

export type SessionsData = {
  group: { id: string; name: string; meetUrl: string };
  people: number;
  sessions: {
    id: string;
    number: number;
    title: string;
    startsAt: string;
    meetUrl: string;
    notice: string | null;
    reminders: {
      id: string;
      sendAt: string;
      status: 'waiting' | 'sent' | 'not sent';
      note: string | null;
    }[];
  }[];
};

export type NoticeData = {
  chosen: string | null;
  templates: { familyId: string; name: string; fields: string[]; usable: boolean }[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * A group's sessions on Google Meet. Attendance is not kept (D61): a session
 * is its day, its Meet link and the text that told the group. A session
 * starts with the group's Meet link, and saving another link makes it the
 * group's link from then on. Sessions are added from the page's header.
 */
export function Sessions({ data }: { data: SessionsData }) {
  return (
    <section className="rounded-[10px] border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-fg">{data.group.name} sessions</h2>
          <p className="text-[12px] text-fg3">
            {data.people} {data.people === 1 ? 'person' : 'people'} taking the class. Meet link:{' '}
            {data.group.meetUrl ? (
              <a
                href={data.group.meetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-accent underline"
              >
                {data.group.meetUrl}
              </a>
            ) : (
              'none yet; add one with the first session.'
            )}
          </p>
        </div>
      </div>

      {data.sessions.length === 0 ? (
        <p className="text-[12.5px] text-fg3">
          No sessions yet. Add the first with + New session, and the group is texted the day, the
          time and the Meet link.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border2">
          {[...data.sessions].reverse().map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-chip text-[12px] font-semibold tabular-nums text-fg2">
                {s.number}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12.5px] font-medium text-fg">
                  {s.title || `Session ${s.number}`}
                </span>
                <span className="text-[11.5px] text-fg3">{when(s.startsAt)}</span>
                <span
                  className={
                    s.notice === 'sent' ? 'text-[11.5px] text-pos' : 'text-[11.5px] text-fg3'
                  }
                >
                  {s.notice === 'sent' ? 'The group was texted.' : s.notice}
                </span>
                {s.reminders.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {s.reminders.map((r) => (
                      <span
                        key={r.id}
                        title={r.note ?? undefined}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px]',
                          r.status === 'sent' && 'border-border text-pos',
                          r.status === 'waiting' && 'border-border text-fg2',
                          r.status === 'not sent' && 'border-border text-warn-fg',
                        )}
                      >
                        {r.status === 'sent'
                          ? 'Reminded'
                          : r.status === 'waiting'
                            ? 'Reminder'
                            : 'Not reminded'}{' '}
                        {when(r.sendAt)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {s.meetUrl && (
                <a
                  href={s.meetUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-7 items-center rounded-[7px] border border-border px-2.5 text-[11.5px] font-medium text-fg hover:bg-hover"
                >
                  Open Meet
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

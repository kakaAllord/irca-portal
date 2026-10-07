'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';

export type SessionsData = {
  group: { id: string; name: string; meetUrl: string };
  people: number;
  sessions: {
    id: string;
    number: number;
    title: string;
    startsAt: string;
    meetUrl: string;
    attendUrl: string;
    attended: number;
    selfMarked: number;
    notice: string | null;
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
 * A group's sessions on Google Meet. Each has its attendance link, made with
 * it, to paste into the Meet chat; people mark themselves there. A session
 * starts with the group's Meet link, and saving another link makes it the
 * group's link from then on.
 */
export function Sessions({ data, notice }: { data: SessionsData; notice: NoticeData | null }) {
  return (
    <div className="flex flex-col gap-4">
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
          <NewSession groupId={data.group.id} meetUrl={data.group.meetUrl} />
        </div>

        {data.sessions.length === 0 ? (
          <p className="text-[12.5px] text-fg3">
            No sessions yet. Add the first; it gets its attendance link straight away.
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
                  <span className="text-[11.5px] text-fg3">
                    {when(s.startsAt)} · {s.attended} of {data.people} came
                    {s.selfMarked > 0 && ` (${s.selfMarked} marked themselves)`}
                  </span>
                  <span
                    className={
                      s.notice === 'sent' ? 'text-[11.5px] text-pos' : 'text-[11.5px] text-fg3'
                    }
                  >
                    {s.notice === 'sent' ? 'The group was texted.' : s.notice}
                  </span>
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
                <CopyLink url={s.attendUrl} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {notice && <NoticePicker notice={notice} />}
    </div>
  );
}

/** Copies a session's attendance link, to paste into the Meet chat. */
export function CopyLink({ url, label = 'Copy attendance link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this link', url);
        }
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}

function NewSession({ groupId, meetUrl }: { groupId: string; meetUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', startsAt: '', meetUrl });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ number: number; attendUrl: string } | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await clientApi<{ number: number; attendUrl: string }>(
        `/membership/discipleship/groups/${groupId}/sessions`,
        {
          method: 'POST',
          body: {
            title: form.title,
            // The admin's own clock, which is the church's.
            startsAt: new Date(form.startsAt).toISOString(),
            meetUrl: form.meetUrl,
          },
        },
      );
      setMade(res);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    setOpen(false);
    setMade(null);
    setForm({ title: '', startsAt: '', meetUrl });
  };

  return (
    <Can permission="membership.discipleship.manage">
      <Button size="sm" onClick={() => setOpen(true)}>
        + New session
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title={made ? `Session ${made.number} is ready` : 'Add a session'}
        description={
          made
            ? 'Paste its attendance link into the Meet chat when the session ends.'
            : 'The group is texted with the day, the time and the Meet link, if a text is chosen below the sessions.'
        }
        footer={
          made ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <SubmitButton
                loading={busy}
                missing={[
                  ...(form.startsAt ? [] : ['Day and time']),
                  ...(form.meetUrl.trim() ? [] : ['Meet link']),
                ]}
                onClick={save}
              >
                Add the session
              </SubmitButton>
            </>
          )
        }
      >
        {made ? (
          <div className="flex flex-col gap-3 text-[12.5px] text-fg2">
            <p className="break-all rounded-[8px] border border-border bg-surface2 px-3 py-2 font-mono text-[12px] text-fg">
              {made.attendUrl}
            </p>
            <CopyLink url={made.attendUrl} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Input
              label="Title"
              placeholder="Prayer and the Word (optional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Day and time"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
            <Input
              label="Google Meet link"
              required
              placeholder="https://meet.google.com/abc-defg-hij"
              value={form.meetUrl}
              onChange={(e) => setForm({ ...form, meetUrl: e.target.value })}
              hint={
                meetUrl
                  ? 'The group’s link. Change it only for a different meeting; the new one is kept for the next session.'
                  : 'Kept for the group’s next sessions.'
              }
            />
          </div>
        )}
      </Drawer>
    </Can>
  );
}

/** The one approved template a new session texts its group with. */
function NoticePicker({ notice }: { notice: NoticeData }) {
  const router = useRouter();
  const [chosen, setChosen] = useState(notice.chosen ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(familyId: string) {
    setChosen(familyId);
    setError(null);
    setSaved(false);
    try {
      await clientApi('/membership/discipleship/session-notice', {
        method: 'PUT',
        body: { familyId: familyId || null },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  return (
    <section className="rounded-[10px] border border-border bg-surface p-4">
      <h2 className="text-[13px] font-semibold text-fg">The text for new sessions</h2>
      <p className="mb-3 text-[12px] text-fg3">
        An approved church-wide template from Communications. Its blanks are filled with the group,
        the date, the time, and the Meet link as Where. Edit the words in Communications →
        Templates; once approved, the new words are used.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="max-w-sm">
        <Select
          label="Template"
          value={chosen}
          onChange={(e) => save(e.target.value)}
          options={[
            { value: '', label: 'None: do not text the group' },
            ...notice.templates
              .filter((t) => t.usable)
              .map((t) => ({ value: t.familyId, label: t.name })),
          ]}
        />
      </div>
      {saved && <p className="mt-2 text-[12px] text-pos">Saved.</p>}
      {notice.templates.length > 0 && !notice.templates.some((t) => t.usable) && (
        <p className="mt-2 text-[12px] text-fg3">
          None of the approved templates fits: use only the first name, the group, the date, the
          time and Where.
        </p>
      )}
    </section>
  );
}

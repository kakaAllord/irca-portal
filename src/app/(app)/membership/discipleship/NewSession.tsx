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
import type { Group } from '@/modules/membership/types';
import { CopyLink, type NoticeData } from './Sessions';

/** As the API takes them, and no more. */
const MAX_REMINDERS = 6;

/** A moment as a datetime-local input shows it, on the admin's own clock. */
const local = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 16);
};

/**
 * A first guess for the next reminder: the day before the session, else two
 * hours before, else halfway; always after now and the reminders already set.
 */
function suggest(startsAt: string, taken: string[]): string {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  for (const before of [24, 2, 1]) {
    const at = start - before * 3_600_000;
    if (at > now && !taken.includes(local(new Date(at)))) return local(new Date(at));
  }
  return local(new Date(now + (start - now) / 2));
}

/**
 * A session for one group: the group attending, the day and time, and the
 * Meet link, which starts as the group's own. The text the group is sent is
 * chosen here too, and kept for the next session of any group.
 */
export function NewSession({
  groups,
  groupId,
  notice,
}: {
  /** The groups still meeting. */
  groups: Group[];
  /** The group on screen, chosen to begin with. */
  groupId?: string;
  notice: NoticeData | null;
}) {
  const router = useRouter();
  const blank = (id = groupId ?? '') => ({
    groupId: id,
    title: '',
    startsAt: '',
    meetUrl: groups.find((g) => g.id === id)?.meetUrl ?? '',
    familyId: notice?.chosen ?? '',
    reminders: [] as string[],
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ number: number; attendUrl: string } | null>(null);

  const group = groups.find((g) => g.id === form.groupId);
  const usable = notice?.templates.filter((t) => t.usable) ?? [];

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (notice && form.familyId !== (notice.chosen ?? '')) {
        await clientApi('/membership/discipleship/session-notice', {
          method: 'PUT',
          body: { familyId: form.familyId || null },
        });
      }
      const res = await clientApi<{ number: number; attendUrl: string }>(
        `/membership/discipleship/groups/${form.groupId}/sessions`,
        {
          method: 'POST',
          body: {
            title: form.title,
            // The admin's own clock, which is the church's.
            startsAt: new Date(form.startsAt).toISOString(),
            meetUrl: form.meetUrl,
            reminders: form.familyId
              ? form.reminders.filter(Boolean).map((r) => new Date(r).toISOString())
              : [],
          },
        },
      );
      setMade(res);
      router.push(`/membership/discipleship?view=sessions&group=${form.groupId}`);
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
    setError(null);
  };

  if (groups.length === 0) return null;

  return (
    <Can permission="membership.discipleship.manage">
      <Button
        onClick={() => {
          setForm(blank());
          setOpen(true);
        }}
      >
        + New session
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title={made ? `Session ${made.number} is ready` : 'Add a session'}
        description={
          made
            ? 'Paste its attendance link into the Meet chat when the session ends.'
            : 'Everyone taking the class in the group is texted the day, the time and the Meet link.'
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
                  ...(form.groupId ? [] : ['Group']),
                  ...(form.startsAt ? [] : ['Day and time']),
                  ...(form.meetUrl.trim() ? [] : ['Meet link']),
                  ...(form.familyId && form.reminders.some((r) => !r) ? ['Reminder time'] : []),
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
            <Select
              label="Group attending"
              required
              value={form.groupId}
              onChange={(e) =>
                setForm({
                  ...form,
                  groupId: e.target.value,
                  // Each group meets on its own link.
                  meetUrl: groups.find((g) => g.id === e.target.value)?.meetUrl ?? '',
                })
              }
              options={[
                { value: '', label: 'Choose a group' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
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
                group?.meetUrl
                  ? 'The group’s link. Change it only for a different meeting; the new one is kept for the group’s next session.'
                  : 'Kept for the group’s next sessions.'
              }
            />
            {notice && (
              <div className="flex flex-col gap-1.5">
                <Select
                  label="Text the group with"
                  value={form.familyId}
                  onChange={(e) => setForm({ ...form, familyId: e.target.value })}
                  options={[
                    { value: '', label: 'Do not text the group' },
                    ...usable.map((t) => ({ value: t.familyId, label: t.name })),
                  ]}
                />
                <p className="text-[11.5px] text-fg3">
                  {usable.length === 0
                    ? 'No approved template fits yet. Write one in Communications → Templates using only the first name, the group, the date, the time and Where.'
                    : 'An approved template from Communications. Its blanks are filled with the group, the date, the time, and the Meet link as Where. Remembered for the next session.'}
                </p>
              </div>
            )}
            {notice && form.familyId && (
              <Reminders
                startsAt={form.startsAt}
                value={form.reminders}
                onChange={(reminders) => setForm({ ...form, reminders })}
              />
            )}
          </div>
        )}
      </Drawer>
    </Can>
  );
}

/**
 * When the group is texted again before the session, with the same template:
 * any moments from now until the session starts, outside quiet hours.
 */
function Reminders({
  startsAt,
  value,
  onChange,
}: {
  startsAt: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const now = local(new Date());
  return (
    <fieldset className="flex flex-col gap-2 rounded-[8px] border border-border p-3">
      <legend className="px-1 text-[12px] font-medium text-fg2">Remind them</legend>
      <p className="text-[11.5px] text-fg3">
        {startsAt
          ? 'The group gets the same text again at each time below, from now until the session starts. Nothing goes out during quiet hours.'
          : 'Choose the day and time of the session first.'}
      </p>
      {value.map((at, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label={`Reminder ${i + 1}`}
              type="datetime-local"
              required
              min={now}
              max={startsAt || undefined}
              value={at}
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            />
          </div>
          <Button
            variant="ghost"
            aria-label={`Remove reminder ${i + 1}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      {startsAt && value.length < MAX_REMINDERS && new Date(startsAt).getTime() > Date.now() && (
        <div>
          <Button size="sm" onClick={() => onChange([...value, suggest(startsAt, value)])}>
            + Add a reminder
          </Button>
        </div>
      )}
    </fieldset>
  );
}

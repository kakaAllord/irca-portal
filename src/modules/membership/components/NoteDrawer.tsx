'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';

/**
 * Writing down a note. Notes are private, so only pastors and administrators
 * read them back. Logging visits and calls is switched off until the church
 * needs it.
 */
export function NoteDrawer({
  personId,
  name,
  label = 'Add note',
  size = 'sm',
}: {
  personId: string;
  name: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/membership/people/${personId}/notes`, {
        method: 'POST',
        body: { body },
      });
      setOpen(false);
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Can permission="membership.notes.write">
      <Button size={size} variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={`Add a note for ${name || 'them'}`}
        description="Only pastors and administrators can read these back."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={body.trim().length < 2 ? ['The note'] : []}
              onClick={save}
            >
              Save
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="note-body" className="text-[12px] font-medium text-fg2">
              The note
              <RequiredMark />
            </label>
            <textarea
              id="note-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-[7px] border border-border bg-input px-3 py-2 text-[13px] text-fg focus:border-accent focus:ring-2 focus:ring-accent-br focus:outline-none"
              placeholder="Works night shifts, Sundays are hard."
            />
          </div>
        </div>
      </Drawer>
    </Can>
  );
}

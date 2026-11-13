'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';

/** Starting a new class group: 'Thursday group', 'Saturday group'. */
export function NewGroup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await clientApi('/membership/discipleship/groups', {
        method: 'POST',
        body: { name, meetUrl },
      });
      setOpen(false);
      setName('');
      setMeetUrl('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Can permission="membership.discipleship.manage">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New group
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Start a foundation class group"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={name.trim().length < 2 ? ['Name'] : []}
              onClick={save}
            >
              Start it
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Name"
            required
            placeholder="Thursday group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label="Google Meet link"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetUrl}
            onChange={(e) => setMeetUrl(e.target.value)}
            hint="Optional. Every session starts with it; you can add it with the first session instead."
          />
        </div>
      </Drawer>
    </Can>
  );
}

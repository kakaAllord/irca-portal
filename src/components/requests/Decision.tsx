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

/**
 * Yes or no on something waiting for an administrator (D37): a template's
 * final approval, or an emergency message. Saying no needs a reason, which
 * goes back to whoever wrote it; nobody decides their own.
 */
export function Decision({
  base,
  mine,
  yes,
  no,
  question,
  sayingYes,
}: {
  /** `/admin/templates/<id>`: `/approve` and `/reject` are added. */
  base: string;
  mine: boolean;
  yes: string;
  no: string;
  /** What approving asks, in words. */
  question: string;
  /** What happens when they say yes. */
  sayingYes: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mine) {
    return <p className="text-[12px] text-fg3">You wrote this. Another administrator decides.</p>;
  }

  async function decide(what: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`${base}/${what}`, {
        method: 'POST',
        body: note.trim() ? { note: note.trim() } : {},
      });
      setConfirm(null);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <Alert tone="error">{error}</Alert>}
      <Button variant="ghost" onClick={() => setConfirm('reject')}>
        {no}…
      </Button>
      <Button onClick={() => setConfirm('approve')}>{yes}</Button>
      <Drawer
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reject' ? `${no}?` : question}
        description={
          confirm === 'reject' ? 'Say why, so whoever wrote it knows what to change.' : sayingYes
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <SubmitButton
              variant={confirm === 'reject' ? 'danger' : 'primary'}
              loading={busy}
              missing={confirm === 'reject' && note.trim().length < 3 ? ['Why not?'] : []}
              onClick={() => decide(confirm!)}
            >
              {confirm === 'reject' ? no : yes}
            </SubmitButton>
          </>
        }
      >
        <Input
          label={confirm === 'reject' ? 'Why not?' : 'Note (optional)'}
          required={confirm === 'reject'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Drawer>
    </>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { AccountKindKey } from '@/shared';
import { KindChoice } from './KindChoice';

/**
 * Invite a pastor or an administrator: an email, a name, and which (D30).
 * The people of Finance, Communications and Outreach are invited by being
 * added to their department in Admin → Departments (D31).
 */
export function InviteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [kinds, setKinds] = useState<AccountKindKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setEmail('');
    setFullName('');
    setKinds([]);
    setError(null);
    setEmailError(undefined);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(undefined);
    setBusy(true);
    try {
      await clientApi('/admin/users/invitations', {
        method: 'POST',
        body: { email, fullName, kinds },
      });
      setSentTo(email);
      close();
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiRequestError) {
        // "Already invited", "already has access" and the like belong next to
        // the email, which is what they are about.
        if (['ALREADY_MEMBER', 'ALREADY_INVITED', 'MEMBER_DISABLED'].includes(err.code)) {
          return setEmailError(err.message);
        }
        return setError(err.message);
      }
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  // What the form is still waiting for, in the words on the labels.
  const missing = [
    !email.trim() && 'Email',
    !fullName.trim() && 'Full name',
    kinds.length === 0 && 'pastor or administrator',
  ].filter(Boolean) as string[];

  return (
    <>
      {sentTo && <Alert>Invitation sent to {sentTo}.</Alert>}
      <Button onClick={() => setOpen(true)}>+ Invite person</Button>

      <Drawer
        open={open}
        onClose={close}
        title="Invite a person"
        description="They will get an email with a link to set their password."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton type="submit" form="invite-form" loading={busy} missing={missing}>
              Send invitation
            </SubmitButton>
          </>
        }
      >
        <form id="invite-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
          <Input
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[12px] font-medium text-fg2">
              What are they?
              <RequiredMark />
            </legend>
            <KindChoice value={kinds} onChange={setKinds} />
            <p className="text-[11.5px] text-fg3">
              Someone in Finance, Communications or Outreach is added to their department in
              Departments instead, which invites them.
            </p>
          </fieldset>

          {error && <Alert tone="error">{error}</Alert>}
        </form>
      </Drawer>
    </>
  );
}

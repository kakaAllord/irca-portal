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
import { STAGE_LABEL } from '../membership/types';
import { PersonSearch } from './PersonSearch';
import { ACCOUNT_STATUS, type MemberCandidate } from './types';

/**
 * Adding someone from People to a department: its leaders do it for a
 * department with no portal; an administrator does it for one with a portal,
 * where being added opens the portal (D31), so the drawer also gives them a
 * way to sign in, asking for an email when there is none on record.
 */
export function AddMemberDrawer({
  departmentId,
  name,
  portal = false,
}: {
  departmentId: string;
  name: string;
  /** The department has a portal: adding someone gives them a login. */
  portal?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<MemberCandidate | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setChosen(null);
    setEmail('');
    setError(null);
    setFieldErrors({});
  }

  const noAccount = portal && chosen !== null && !chosen.account;
  const needsEmail = noAccount && !chosen?.emailOnRecord;

  async function save() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await clientApi<{ invited: boolean }>(`/departments/${departmentId}/members`, {
        method: 'POST',
        body: { personId: chosen.personId, ...(noAccount ? { email } : {}) },
      });
      setDone(
        res.invited
          ? `${chosen.name} is in ${name}, and has been sent an email to set a password.`
          : portal
            ? `${chosen.name} is in ${name}. They see its portal when they next sign in.`
            : null,
      );
      close();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFieldErrors(err.fieldErrors);
        setError(err.message);
      } else setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const missing = [!chosen && 'Person', needsEmail && !email.trim() && 'Email'].filter(
    Boolean,
  ) as string[];

  return (
    <>
      {done && (
        <div className="order-last basis-full">
          <Alert>{done}</Alert>
        </div>
      )}
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add a member
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title={`Add someone to ${name}`}
        description={
          portal
            ? `Anyone who has filled in the registration form. Being in ${name} opens its portal, so they can sign in.`
            : 'Anyone who has filled in the registration form. Someone who has not, fills it in first.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton loading={busy} missing={missing} onClick={save}>
              Add them
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <PersonSearch<MemberCandidate>
            label="Person"
            endpoint={`/departments/${departmentId}/member-candidates`}
            describe={(c) =>
              [
                STAGE_LABEL[c.stage],
                c.phoneTail && `phone ${c.phoneTail}`,
                portal &&
                  (c.account
                    ? `${c.account.email}, ${ACCOUNT_STATUS[c.account.status]}`
                    : 'no account yet'),
              ]
                .filter(Boolean)
                .join(' · ')
            }
            chosen={chosen}
            onChoose={setChosen}
            emptyHint={`Nobody by that name who has registered on the form and is not already in ${name}.`}
          />
          {noAccount && (
            <>
              <Input
                label="Email they will sign in with"
                type="email"
                required={needsEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint={
                  chosen?.emailOnRecord
                    ? 'Leave empty to use the email on their record.'
                    : 'They have no email on record.'
                }
                error={fieldErrors.email?.[0]}
              />
              <p className="text-[11.5px] text-fg3">
                They have no account yet, so they will be sent an invitation to set a password.
              </p>
            </>
          )}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Drawer>
    </>
  );
}

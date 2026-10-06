'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PersonSearch } from './PersonSearch';
import { PositionCombobox, type PositionValue } from './PositionCombobox';
import {
  ACCOUNT_STATUS as ACCOUNT,
  type Leader,
  type LeaderCandidate,
  type Position,
} from './types';

/**
 * An administrator naming a leader: a confirmed member, their position, and —
 * when they have no account and no email on record — the email they will
 * sign in with. What they may do comes from leading, so no role is asked for.
 */
export function NameLeaderDrawer({
  departmentId,
  name,
  leaders,
}: {
  departmentId: string;
  name: string;
  /** Who leads it now, to warn before a second person takes the same position. */
  leaders: Leader[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<LeaderCandidate | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [position, setPosition] = useState<PositionValue>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setChosen(null);
    setPosition(null);
    setEmail('');
    setError(null);
    setFieldErrors({});
  }

  // Every position, in the order leaders are listed; the field offers those turned on.
  useEffect(() => {
    if (!open) return;
    clientApi<Position[]>('/admin/leader-positions')
      .then(setPositions)
      .catch(() => setError('Could not load the positions. Close this and try again.'));
  }, [open]);
  // Two co-chairs happen, so this warns and lets it through.
  const holder = position && leaders.find((l) => l.positionId === position.id);

  // No account yet and nothing on record: the email is what they sign in with.
  const needsEmail = chosen !== null && !chosen.account && !chosen.emailOnRecord;

  async function save() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await clientApi<{ invited: boolean }>(
        `/admin/departments/${departmentId}/leaders`,
        {
          method: 'POST',
          body: { personId: chosen.personId, positionId: position?.id, email },
        },
      );
      setDone(
        res.invited
          ? `${chosen.name} is ${position?.name} of ${name}, and has been sent an email to set a password.`
          : `${chosen.name} is ${position?.name} of ${name}. They see it when they next sign in.`,
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

  const missing = [
    !chosen && 'Confirmed member',
    !position && 'Position',
    needsEmail && !email.trim() && 'Email',
  ].filter(Boolean) as string[];

  return (
    <>
      {done && (
        // On a line of its own under the heading, not squeezed beside it.
        <div className="order-last basis-full">
          <Alert>{done}</Alert>
        </div>
      )}
      <Button size="sm" onClick={() => setOpen(true)}>
        + Name a leader
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title={`Name a leader of ${name}`}
        description="Only a confirmed member can lead. They can then add the department's members themselves."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton loading={busy} missing={missing} onClick={save}>
              Name them
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <PersonSearch<LeaderCandidate>
            label="Confirmed member"
            endpoint="/admin/departments/leader-candidates"
            describe={(c) =>
              [
                c.phoneTail && `phone ${c.phoneTail}`,
                c.account ? `${c.account.email}, ${ACCOUNT[c.account.status]}` : 'no account yet',
              ]
                .filter(Boolean)
                .join(' · ')
            }
            chosen={chosen}
            onChoose={setChosen}
            emptyHint="No confirmed member by that name. The pastors confirm members in Membership → Applications."
          />
          <PositionCombobox
            positions={positions}
            value={position}
            onChange={setPosition}
            onAdded={(p) => setPositions((all) => [...all, p])}
          />
          {holder && (
            <p className="text-[11.5px] text-warn-fg">
              {holder.name} is already {holder.title} of {name}. You can still name a second.
            </p>
          )}
          {chosen && !chosen.account && (
            <Input
              label="Email they will sign in with"
              type="email"
              required={needsEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint={
                chosen.emailOnRecord
                  ? 'Leave empty to use the email on their record.'
                  : 'They have no email on record.'
              }
              error={fieldErrors.email?.[0]}
            />
          )}
          {chosen && !chosen.account && (
            <p className="text-[11.5px] text-fg3">
              They have no account yet, so they will be sent an invitation to set a password.
            </p>
          )}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Drawer>
    </>
  );
}

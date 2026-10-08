'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ViewAsButton } from '@/components/shell/ViewAsButton';

type Person = {
  userId: string;
  fullName: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  isYou: boolean;
  canImpersonate: boolean;
  canDelete?: boolean;
  invitation?: { accepted: boolean; revoked: boolean } | null;
};

/** View as, disable and re-enable, and the invitation's own buttons. */
export function PersonActions({ me, person }: { me: MeResponse; person: Person }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canManage = me.permissions.includes('admin.users.manage');
  const canInvite = me.permissions.includes('admin.users.invite');

  async function call(
    what: string,
    run: () => Promise<unknown>,
    after: 'refresh' | 'home' | 'users' = 'refresh',
  ) {
    setBusy(what);
    setError(null);
    try {
      await run();
      if (after === 'home') {
        // Where to come back to when they stop viewing.
        sessionStorage.setItem('irca_return_to', window.location.pathname);
        router.replace('/');
      }
      if (after === 'users') {
        router.replace('/admin/users');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
      setConfirmDisable(false);
      setConfirmRevoke(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {/* One click, no reason asked for, and the person is never told. */}
        {person.canImpersonate && <ViewAsButton userId={person.userId} name={person.fullName} />}

        {canInvite && person.status === 'INVITED' && (
          <>
            <Button
              variant="secondary"
              loading={busy === 'resend'}
              onClick={() =>
                call('resend', () =>
                  clientApi(`/admin/users/${person.userId}/invitation/resend`, { method: 'POST' }),
                )
              }
            >
              Resend invitation
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmRevoke(true)}
            >
              Revoke invitation
            </Button>
          </>
        )}

        {canManage && person.status === 'ACTIVE' && !person.isYou && (
          <Button variant="ghost" onClick={() => setConfirmDisable(true)}>
            Disable access
          </Button>
        )}
        {canInvite && person.canDelete && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete person
          </Button>
        )}
        {canManage && person.status === 'DISABLED' && !person.canDelete && (
          <Button
            variant="secondary"
            loading={busy === 'enable'}
            onClick={() =>
              call('enable', () =>
                clientApi(`/admin/users/${person.userId}/access`, {
                  method: 'PUT',
                  body: { enabled: true },
                }),
              )
            }
          >
            Restore access
          </Button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Dialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title={`Revoke the invitation for ${person.fullName}?`}
        description="The link in their email stops working at once. You can delete them afterwards, since they never joined."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy === 'cancel'}
              onClick={() =>
                call('cancel', () =>
                  clientApi(`/admin/users/${person.userId}/invitation`, { method: 'DELETE' }),
                )
              }
            >
              Revoke invitation
            </Button>
          </>
        }
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${person.fullName}?`}
        description="They never joined, so nothing they did is lost. This removes them from the list for good."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy === 'delete'}
              onClick={() =>
                call(
                  'delete',
                  () => clientApi(`/admin/users/${person.userId}`, { method: 'DELETE' }),
                  'users',
                )
              }
            >
              Delete person
            </Button>
          </>
        }
      />

      <Dialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        title={`Disable ${person.fullName}?`}
        description={`They will be signed out of this church and will not be able to sign in until you restore it. Everything they recorded stays.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDisable(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy === 'disable'}
              onClick={() =>
                call('disable', () =>
                  clientApi(`/admin/users/${person.userId}/access`, {
                    method: 'PUT',
                    body: { enabled: false },
                  }),
                )
              }
            >
              Disable access
            </Button>
          </>
        }
      />
    </div>
  );
}

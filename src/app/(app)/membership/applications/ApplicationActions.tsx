'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Spinner } from '@/components/ui/Spinner';
import { Can } from '@/lib/session';
import { cn } from '@/lib/cn';
import type { PersonRow } from '@/modules/membership/types';
import type { Application } from './page';

/**
 * What each step offers: a tick and a cross under review, Confirm once
 * approved (whenever the pastors are ready, D54), or the record. Rejecting
 * asks for a reason first, because it is written down and the person may ask
 * why.
 */
export function ApplicationActions({ application: a }: { application: Application }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body: object = {}) {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/membership/applications/${a.id}/${path}`, { method: 'POST', body });
      setRejecting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (a.status === 'CONFIRMED') {
    return (
      <Link
        href={`/membership/people/${a.person.id}`}
        className="inline-flex h-7 items-center rounded-[7px] border border-border px-2.5 text-[11.5px] font-medium text-fg hover:bg-hover"
      >
        Record
      </Link>
    );
  }

  return (
    <Can permission="membership.applications.decide">
      {error && <Alert tone="error">{error}</Alert>}
      {a.status === 'UNDER_REVIEW' && (
        <span className="flex items-center gap-1.5">
          <RoundAction
            label="Approve application"
            tone="positive"
            busy={busy}
            onClick={() => run('approve')}
          >
            <path d="M4 10.5l3.5 3.5L16 6" />
          </RoundAction>
          <RoundAction
            label="Reject application"
            tone="danger"
            align="end"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
          </RoundAction>
        </span>
      )}
      {a.status === 'APPROVED' && (
        <Button size="sm" loading={busy} onClick={() => run('confirm')}>
          Confirm
        </Button>
      )}

      <Drawer
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={`Reject ${a.person.fullName}'s application?`}
        description="They go back to where they were before they applied. The reason is written down."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <SubmitButton
              variant="danger"
              loading={busy}
              missing={reason.trim().length < 3 ? ['Reason'] : []}
              onClick={() => run('reject', { reason })}
            >
              Reject application
            </SubmitButton>
          </>
        }
      >
        <Input
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
      </Drawer>
    </Can>
  );
}

/**
 * A round icon button that names itself: the name is its accessible label,
 * and shows above it on hover and on keyboard focus.
 */
function RoundAction({
  label,
  tone,
  align = 'center',
  busy = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  tone: 'positive' | 'danger';
  /** Where the name sits: centred, or ending at the button's right edge. */
  align?: 'center' | 'end';
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        onClick={onClick}
        className={cn(
          'flex size-8 items-center justify-center rounded-full border bg-surface transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:opacity-60',
          tone === 'positive'
            ? 'border-pos-br text-pos hover:border-pos hover:bg-pos-bg'
            : 'border-danger-br text-danger hover:border-danger hover:bg-danger-bg',
        )}
      >
        {busy ? (
          <Spinner />
        ) : (
          <svg
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {children}
          </svg>
        )}
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none invisible absolute bottom-full z-30 mb-1.5 whitespace-nowrap',
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
          'rounded-[6px] bg-btn-bg px-2 py-1 text-[11px] font-medium text-btn-fg shadow-md',
          'opacity-0 transition-opacity group-hover:visible group-hover:opacity-100',
          'group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100',
        )}
      >
        {label}
      </span>
    </span>
  );
}

/** The office entering an application for someone. */
export function NewApplication() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [personId, setPersonId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      clientApi<{ rows: PersonRow[] }>(`/membership/people?pageSize=20&q=${encodeURIComponent(q)}`)
        .then((res) => setPeople(res.rows))
        .catch(() => setPeople([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [open, q]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await clientApi('/membership/applications', { method: 'POST', body: { personId } });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Can permission="membership.applications.submit">
      <Button onClick={() => setOpen(true)}>+ New application</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Enter a membership application"
        description="They move to Membership review, and a pastor decides."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton loading={busy} missing={personId ? [] : ['Person']} onClick={save}>
              Enter application
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Find them"
            placeholder="Name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            label="Person"
            required
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            options={[
              { value: '', label: people.length ? 'Choose someone' : 'Nobody matches yet' },
              ...people.map((p) => ({
                value: p.id,
                label: `${p.fullName || 'Unknown'} · ${p.phone || 'no phone'}`,
              })),
            ]}
          />
        </div>
      </Drawer>
    </Can>
  );
}

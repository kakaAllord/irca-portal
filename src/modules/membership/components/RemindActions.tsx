'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useCan } from '@/lib/session';

/** Membership's own permission, or Communications' (D55). */
export function useMayRemind() {
  const can = useCan();
  return can('membership.registrations.remind') || can('comms.registrations.remind');
}

/** Who a text goes to: these people, or everyone not finished. */
export type Recipients = { personIds: string[]; names: string[] } | { all: true; joining: boolean };

/**
 * Copy someone's own link to finish the form, or text it to them. Both are
 * recorded, so two people in the office do not chase the same visitor.
 */
export function RowRemind({ personId, name }: { personId: string; name: string }) {
  const mayRemind = useMayRemind();
  const [copied, setCopied] = useState(false);
  const [texting, setTexting] = useState(false);
  if (!mayRemind) return null;

  async function copy() {
    const { url } = await clientApi<{ url: string }>(`/comms/unfinished/${personId}/link`);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link', url);
    }
    await clientApi(`/comms/unfinished/${personId}/reminders`, {
      method: 'POST',
      body: { channel: 'COPY_LINK' },
    }).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="secondary" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setTexting(true)}>
        Text
      </Button>
      <TextDrawer
        open={texting}
        onClose={() => setTexting(false)}
        to={{ personIds: [personId], names: [name || 'them'] }}
      />
    </span>
  );
}

/**
 * Texting people their own link with an approved template that carries
 * {{link}}. The words are written in Communications and approved by an
 * administrator; here they are only chosen.
 */
export function TextDrawer({
  open,
  onClose,
  to,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  to: Recipients;
  onSent?: () => void;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<{ familyId: string; name: string }[] | null>(null);
  const [familyId, setFamilyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ texted: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    clientApi<{ familyId: string; name: string }[]>('/comms/unfinished/templates')
      .then((rows) => {
        setTemplates(rows);
        setFamilyId((f) => f || rows[0]?.familyId || '');
      })
      .catch(() => setTemplates([]));
  }, [open]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await clientApi<{ texted: number; skipped: number }>('/comms/unfinished/text', {
        method: 'POST',
        body:
          'all' in to
            ? { familyId, all: true, joining: to.joining }
            : { familyId, personIds: to.personIds },
      });
      setDone(res);
      onSent?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const who =
    'all' in to
      ? to.joining
        ? 'everyone who wants to join and has not finished the form'
        : 'everyone who has not finished the form'
      : to.names.length === 1
        ? to.names[0]
        : `${to.names.length} people`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Text ${who} their link`}
      description="Each gets their own link to finish the form, in the language they chose. Anyone texted in the last few days, or who asked for no texts, is left out."
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton loading={busy} missing={familyId ? [] : ['Template']} onClick={send}>
              Send the text
            </SubmitButton>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4 text-[12.5px] text-fg2">
        {error && <Alert tone="error">{error}</Alert>}
        {done ? (
          <Alert tone="info">
            Texted {done.texted} {done.texted === 1 ? 'person' : 'people'}
            {done.skipped > 0 &&
              `; ${done.skipped} left out (texted recently, no phone, or no texts)`}
            .
          </Alert>
        ) : templates === null ? (
          <p className="text-fg3">Loading the templates…</p>
        ) : templates.length === 0 ? (
          <p>
            There is no approved template with their link yet. In Communications → Templates, write
            one using <code>{'{{link}}'}</code> (and <code>{'{{first_name}}'}</code> if you like),
            and an administrator approves it.
          </p>
        ) : (
          <>
            <Select
              label="Template"
              required
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              options={templates.map((t) => ({ value: t.familyId, label: t.name }))}
            />
            <p className="text-fg3">
              Templates are written and edited in Communications → Templates, and approved by an
              administrator.
            </p>
          </>
        )}
      </div>
    </Drawer>
  );
}

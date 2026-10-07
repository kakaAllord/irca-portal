'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { MessagingSettings } from '@/modules/dev/types';

type Note = { tone: 'info' | 'error'; text: string } | null;

function Card({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-border bg-surface p-4">
      <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
      <p className="mt-0.5 mb-3 max-w-xl text-[11.5px] text-fg3">{intro}</p>
      {children}
    </section>
  );
}

const NO_KEY =
  'The server cannot keep a password safely yet: whoever runs it must set SETTINGS_KEY in its .env. Until then everything is only written to its log.';

/**
 * The account emails go out through (D52): any SMTP account, Gmail with an
 * app password being the usual one. The password is typed here and never
 * shown again. With none saved, every email is written to the server's log,
 * which Dev → Logs shows.
 */
export function EmailCard({ email }: { email: MessagingSettings['email'] }) {
  const router = useRouter();
  const [host, setHost] = useState(email.host ?? 'smtp.gmail.com');
  const [port, setPort] = useState(String(email.port ?? 465));
  const [user, setUser] = useState(email.user ?? '');
  const [password, setPassword] = useState('');
  const [from, setFrom] = useState(email.from ?? '');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function save() {
    setBusy(true);
    setNote(null);
    setErrors({});
    try {
      await clientApi('/dev/messaging/email', {
        method: 'PUT',
        body: { host, port: Number(port), user, from, ...(password ? { password } : {}) },
      });
      setPassword('');
      setNote({ tone: 'info', text: 'Saved. Send yourself a test to be sure.' });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setNote({ tone: 'error', text: err.message });
      } else setNote({ tone: 'error', text: 'It did not save.' });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true);
    setNote(null);
    try {
      const res = await clientApi<{ ok: boolean; error?: string; to: string }>(
        '/dev/messaging/email/test',
        { method: 'POST' },
      );
      setNote(
        res.ok
          ? { tone: 'info', text: `Sent to ${res.to}. Check it arrived, and not in spam.` }
          : { tone: 'error', text: res.error ?? 'It was not sent.' },
      );
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    await clientApi('/dev/messaging/email', { method: 'DELETE' });
    setNote({ tone: 'info', text: 'Removed. Emails go to the log again.' });
    router.refresh();
  }

  const missing = [
    !host.trim() && 'Server',
    !port.trim() && 'Port',
    !user.trim() && 'Username',
    !email.saved && !password && 'Password',
    !from.trim() && 'From',
  ].filter(Boolean) as string[];

  return (
    <Card
      title="Email"
      intro="Invitations, password resets and alerts go out through this account. For Gmail: smtp.gmail.com, port 465, the Gmail address, and an app password (Google account → Security → App passwords)."
    >
      <div className="flex flex-col gap-4">
        {!email.canSave && <Alert tone="warn">{NO_KEY}</Alert>}
        <p className="text-[12.5px] text-fg2">
          {email.sending === 'smtp'
            ? `Emails go out through ${email.user} on ${email.host}.`
            : 'No account yet: every email is only written to the server log, where Dev → Logs shows it.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Server"
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            error={errors.host?.[0]}
          />
          <Input
            label="Port"
            required
            inputMode="numeric"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            hint="465, or 587 for STARTTLS."
            error={errors.port?.[0]}
          />
          <Input
            label="Username"
            required
            autoComplete="off"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            error={errors.user?.[0]}
          />
          <PasswordInput
            label={email.saved ? 'New password (leave empty to keep it)' : 'Password'}
            required={!email.saved}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="For Gmail, the 16-letter app password, not your own."
            error={errors.password?.[0]}
          />
          <Input
            label="From"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            hint="Such as IRCA <office@gmail.com>. Gmail sends only as its own address."
            error={errors.from?.[0]}
          />
        </div>
        {note && <Alert tone={note.tone}>{note.text}</Alert>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton loading={busy} missing={missing} disabled={!email.canSave} onClick={save}>
            Save
          </SubmitButton>
          {email.saved && (
            <>
              <Button variant="secondary" loading={testing} onClick={test}>
                Send me a test
              </Button>
              <Button variant="ghost" onClick={remove}>
                Remove the account
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * The Beem account texts go out through (D26, D52), and the link Beem calls
 * with replies. The key and secret are typed here and never shown again:
 * only the key's last four characters come back.
 */
export function TextsCard({
  beem,
  replyUrl,
}: {
  beem: MessagingSettings['beem'];
  replyUrl: string;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [senderId, setSenderId] = useState(beem.senderId ?? '');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function save() {
    setBusy(true);
    setNote(null);
    setErrors({});
    try {
      await clientApi('/dev/messaging/beem', {
        method: 'PUT',
        body: { senderId, ...(apiKey ? { apiKey } : {}), ...(secretKey ? { secretKey } : {}) },
      });
      setApiKey('');
      setSecretKey('');
      setNote({ tone: 'info', text: 'Saved. Test it to be sure.' });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setNote({ tone: 'error', text: err.message });
      } else setNote({ tone: 'error', text: 'It did not save.' });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true);
    setNote(null);
    try {
      const res = await clientApi<{ ok: boolean; credit?: string | null; error?: string }>(
        '/dev/messaging/beem/test',
        { method: 'POST' },
      );
      setNote(
        res.ok
          ? {
              tone: 'info',
              text: `Beem answered.${res.credit ? ` Credit left: ${Number(res.credit).toLocaleString('en-GB')} TZS.` : ''}`,
            }
          : { tone: 'error', text: res.error ?? 'Beem did not answer.' },
      );
    } finally {
      setTesting(false);
    }
  }

  async function renew() {
    await clientApi('/dev/messaging/beem/reply-key', { method: 'POST' });
    setNote({
      tone: 'info',
      text: 'Changed. Give Beem the new link now: the old one stopped working.',
    });
    router.refresh();
  }

  const missing = [
    !senderId.trim() && 'Sender name',
    !beem.saved && !apiKey.trim() && 'Key',
    !beem.saved && !secretKey.trim() && 'Secret',
  ].filter(Boolean) as string[];

  return (
    <Card
      title="Texts (Beem)"
      intro="Every text the system sends goes through this Beem account. Communications sets the price, the daily limit and quiet hours in Comms → Settings."
    >
      <div className="flex flex-col gap-4">
        {!beem.canSave && <Alert tone="warn">{NO_KEY}</Alert>}
        {beem.saved && !beem.live && (
          <Alert tone="warn">
            This server writes texts to its log instead of sending them (SMS_LIVE is false). Test
            connection still asks Beem for the credit.
          </Alert>
        )}
        <p className="text-[12.5px] text-fg2">
          {beem.saved
            ? `A key ending ${beem.keyHint} is saved.${beem.live ? ' Texts go through Beem.' : ''}`
            : 'No Beem account yet: every text is only written to the server log, where Dev → Logs shows it.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label={beem.saved ? 'New key (leave empty to keep it)' : 'Key'}
            required={!beem.saved}
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            error={errors.apiKey?.[0]}
          />
          <PasswordInput
            label={beem.saved ? 'New secret (leave empty to keep it)' : 'Secret'}
            required={!beem.saved}
            autoComplete="off"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            error={errors.secretKey?.[0]}
          />
          <Input
            label="Sender name"
            required
            maxLength={11}
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            hint="Exactly as Beem registered it, at most 11 characters."
            error={errors.senderId?.[0]}
          />
        </div>
        {note && <Alert tone={note.tone}>{note.text}</Alert>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton loading={busy} missing={missing} disabled={!beem.canSave} onClick={save}>
            Save
          </SubmitButton>
          {beem.saved && (
            <Button variant="secondary" loading={testing} onClick={test}>
              Test connection
            </Button>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <h3 className="text-[12px] font-semibold text-fg2">The link for replies</h3>
          <p className="mt-0.5 mb-2 max-w-xl text-[11.5px] text-fg3">
            Paste it into Beem&apos;s dashboard under two-way SMS, as the callback URL. It carries a
            password, so keep it out of screenshots; a STOP reply then blocks the number for good.
          </p>
          <code className="block break-all rounded-[6px] bg-surface2 px-2 py-1.5 text-[11.5px] text-fg">
            {replyUrl}
          </code>
          <Button className="mt-2" size="sm" variant="ghost" onClick={renew}>
            Change its password
          </Button>
        </div>
      </div>
    </Card>
  );
}

const LEVELS: { value: MessagingSettings['log']['level']; label: string }[] = [
  { value: 'error', label: 'Errors only' },
  { value: 'warn', label: 'Warnings and errors' },
  { value: 'info', label: 'Everyday (info)' },
  { value: 'debug', label: 'Everything (debug)' },
];

/** How much the server writes to its log (D52), applied at once, kept over a restart. */
export function LogLevelCard({ log }: { log: MessagingSettings['log'] }) {
  const router = useRouter();
  const [level, setLevel] = useState(log.level);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      await clientApi('/dev/messaging/log-level', { method: 'PUT', body: { level } });
      setNote({ tone: 'info', text: 'Changed. The next lines are written at this level.' });
      router.refresh();
    } catch (err) {
      setNote({
        tone: 'error',
        text: err instanceof ApiRequestError ? err.message : 'It did not change.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Log level"
      intro="How much the server writes to the log Dev → Logs reads. Emails and texts written to the log instead of sent are everyday lines: below Everyday they no longer show. Everything fills the log's 2,000 lines fast; use it to look into something, then turn it back."
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select
            label="Level"
            value={level}
            options={LEVELS}
            onChange={(e) => setLevel(e.target.value as typeof level)}
          />
        </div>
        <SubmitButton loading={busy} disabled={level === log.level} onClick={save}>
          Change
        </SubmitButton>
      </div>
      {note && (
        <div className="mt-3">
          <Alert tone={note.tone}>{note.text}</Alert>
        </div>
      )}
    </Card>
  );
}

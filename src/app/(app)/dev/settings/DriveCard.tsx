'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { DriveSettings } from '@/modules/dev/types';
import { Card, NO_KEY } from './Messaging';

type Note = { tone: 'info' | 'error'; text: string } | null;

/** The page Google sends the developer back to, on this portal. */
export const RETURN_PATH = '/dev/settings/google-drive';

const gb = (bytes: number) => {
  const n = bytes / 1024 ** 3;
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} GB`;
};

/**
 * Where uploaded files are kept (D58): the church's Google Drive, through
 * an OAuth client made in Google Cloud. The client ID and secret are typed
 * here (the secret never shown again), then Connect sends the developer to
 * Google to choose the account and comes back to `RETURN_PATH`. `outcome` is
 * what that return said, carried in the address.
 */
export function DriveCard({ drive, outcome }: { drive: DriveSettings; outcome: Note }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(drive.clientId ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [folderName, setFolderName] = useState(drive.folderName);
  const [busy, setBusy] = useState<'save' | 'connect' | null>(null);
  const [note, setNote] = useState<Note>(outcome);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);
  // The portal's own address is the browser's to know; the server behind
  // Vercel may not see the same one.
  const [returnUri, setReturnUri] = useState('');
  useEffect(() => setReturnUri(`${window.location.origin}${RETURN_PATH}`), []);

  async function save() {
    setBusy('save');
    setNote(null);
    setErrors({});
    try {
      await clientApi('/dev/files/drive', {
        method: 'PUT',
        body: { clientId, folderName, ...(clientSecret ? { clientSecret } : {}) },
      });
      setClientSecret('');
      setNote({
        tone: 'info',
        text: drive.connected ? 'Saved.' : 'Saved. Now connect the church’s Google account.',
      });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setNote({ tone: 'error', text: err.message });
      } else setNote({ tone: 'error', text: 'It did not save.' });
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy('connect');
    setNote(null);
    try {
      const { url } = await clientApi<{ url: string }>('/dev/files/drive/connect', {
        method: 'POST',
        body: { redirectUri: returnUri },
      });
      window.location.assign(url);
    } catch (err) {
      setNote({
        tone: 'error',
        text: err instanceof ApiRequestError ? err.message : 'Google could not be reached.',
      });
      setBusy(null);
    }
  }

  async function disconnect() {
    await clientApi('/dev/files/drive/disconnect', { method: 'POST' });
    setNote({
      tone: 'info',
      text: 'Disconnected. The files stay in the Drive; uploads stop until it is connected again.',
    });
    router.refresh();
  }

  async function remove() {
    await clientApi('/dev/files/drive', { method: 'DELETE' });
    setClientId('');
    setNote({ tone: 'info', text: 'Removed. The files stay in the Drive.' });
    router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(returnUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const missing = [
    !clientId.trim() && 'Client ID',
    !drive.saved && !clientSecret.trim() && 'Client secret',
  ].filter(Boolean) as string[];

  return (
    <Card
      title="Google Drive"
      intro="Uploaded files, such as GO day reports, are kept in this Google account's Drive: in one folder, by year, then department, then kind of file. The system sees only what it put there."
    >
      <div className="flex flex-col gap-4">
        {!drive.canSave && <Alert tone="warn">{NO_KEY}</Alert>}
        {drive.lost && <Alert tone="warn">{drive.lost}</Alert>}
        <div className="text-[12.5px] text-fg2">
          {drive.connected ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Connected to <span className="font-medium text-fg">{drive.account}</span>
                {drive.space &&
                  ` · ${gb(drive.space.used)}${
                    drive.space.limit ? ` of ${gb(drive.space.limit)}` : ''
                  } used`}
              </span>
              {drive.folderUrl && (
                <a
                  href={drive.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Open the folder “{drive.folderName}”
                </a>
              )}
            </p>
          ) : drive.saved ? (
            <p>Not connected: uploads are refused until the church’s account is connected.</p>
          ) : (
            <p>
              Not set up: uploads are refused. Make an OAuth client in Google Cloud (the deployment
              guide, §7.1, walks through it), then paste it here.
            </p>
          )}
        </div>

        <div>
          <h3 className="text-[12px] font-semibold text-fg2">The address to give Google</h3>
          <p className="mt-0.5 mb-2 max-w-xl text-[11.5px] text-fg3">
            In Google Cloud, add it to the OAuth client under Authorized redirect URIs, exactly.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="block break-all rounded-[6px] bg-surface2 px-2 py-1.5 text-[11.5px] text-fg">
              {returnUri || RETURN_PATH}
            </code>
            <Button size="sm" variant="ghost" onClick={copy} disabled={!returnUri}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Client ID"
            required
            autoComplete="off"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            hint="Ends in .apps.googleusercontent.com"
            error={errors.clientId?.[0]}
          />
          <PasswordInput
            label={drive.saved ? 'New client secret (leave empty to keep it)' : 'Client secret'}
            required={!drive.saved}
            autoComplete="off"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            hint="Starts with GOCSPX-"
            error={errors.clientSecret?.[0]}
          />
          <Input
            label="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            hint="The one folder the system makes at the top of the Drive."
            error={errors.folderName?.[0]}
          />
        </div>
        {note && <Alert tone={note.tone}>{note.text}</Alert>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton
            loading={busy === 'save'}
            missing={missing}
            disabled={!drive.canSave}
            onClick={save}
          >
            Save
          </SubmitButton>
          {drive.saved && (
            <Button
              variant={drive.connected ? 'secondary' : 'primary'}
              loading={busy === 'connect'}
              disabled={!returnUri}
              onClick={connect}
            >
              {drive.connected ? 'Connect another account' : 'Connect Google Drive'}
            </Button>
          )}
          {drive.connected && (
            <Button variant="ghost" onClick={disconnect}>
              Disconnect
            </Button>
          )}
          {drive.saved && !drive.connected && (
            <Button variant="ghost" onClick={remove}>
              Remove the client
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

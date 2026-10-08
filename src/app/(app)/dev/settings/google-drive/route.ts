import { redirect, unstable_rethrow } from 'next/navigation';
import { serverApi } from '@/lib/api/server';
import { ApiRequestError } from '@/lib/api/errors';

/**
 * Where Google sends the developer back after they choose the church's
 * account and allow the system into its Drive (D58). The code Google gives
 * goes straight to the API, which checks it answers a connection started in
 * Dev → Settings and exchanges it for a lasting token; the developer lands
 * back in Settings with what happened, and the code is gone from the address.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  let why: string | null = null;

  if (params.get('error')) {
    why =
      params.get('error') === 'access_denied'
        ? 'Google was not given access, so nothing was connected.'
        : `Google answered: ${params.get('error')}.`;
  } else if (!code || !state) {
    why = 'Google sent nothing back to connect with. Press Connect again.';
  } else {
    try {
      await serverApi('/dev/files/drive/finish', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      });
    } catch (err) {
      // Signed out on the way: serverApi's redirect to sign-in goes through.
      unstable_rethrow(err);
      why = err instanceof ApiRequestError ? err.message : 'The connection did not finish.';
    }
  }

  redirect(
    why
      ? `/dev/settings?${new URLSearchParams({ drive: 'failed', why })}`
      : '/dev/settings?drive=connected',
  );
}

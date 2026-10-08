import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import type { MeResponse } from '@/shared';
import { serverApi, warmApi } from '@/lib/api/server';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  // The form is on screen before the API has answered anything; the database
  // is woken meanwhile, so the sign-in itself does not wait for it.
  after(warmApi);

  return (
    <>
      <Suspense fallback={null}>
        <GoOnIfSignedIn next={next} />
      </Suspense>
      <h1 className="text-[20px] font-semibold text-fg">Sign in</h1>
      <p className="mt-1 text-[12.5px] text-fg2">
        Use the email your church administrator invited you with.
      </p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
    </>
  );
}

/** Already signed in: go straight on, rather than leave a form for nothing. */
async function GoOnIfSignedIn({ next }: { next: string }) {
  const me = await serverApi<MeResponse>('/auth/me', { onUnauthorized: 'null' });
  if (me) redirect(next);
  return null;
}

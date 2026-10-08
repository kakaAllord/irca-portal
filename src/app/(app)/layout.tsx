import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getMe } from '@/lib/api/me';
import { SessionProvider } from '@/lib/session';
import { Shell } from '@/components/shell/Shell';
import { ShellSkeleton } from '@/components/shell/Skeletons';
import { THEME_COOKIE, themeFrom } from '@/lib/theme';

/**
 * Every signed-in page sits inside the portal's frame. The API is asked who is
 * signed in on every page, so a session that has been revoked, has expired, or
 * has lost its church is sent to sign in at once rather than on the next click.
 *
 * The answer takes a moment, so the page does not wait for it: the frame is
 * drawn as grey shapes straight away and swapped for the real one when the
 * answer arrives. (On a click inside the portal this layout is already on
 * screen and does not run again.)
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <SignedInFrame>{children}</SignedInFrame>
    </Suspense>
  );
}

async function SignedInFrame({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const jar = await cookies();
  return (
    <SessionProvider me={me}>
      <Shell
        theme={themeFrom(jar.get(THEME_COOKIE)?.value)}
        sidebarCollapsed={jar.get('irca_sidebar')?.value === 'collapsed'}
      >
        {children}
      </Shell>
    </SessionProvider>
  );
}

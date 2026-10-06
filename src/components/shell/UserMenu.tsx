'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { useMe } from '@/lib/session';
import { cn } from '@/lib/cn';
import { BackIcon, useStopViewing } from './useStopViewing';

/**
 * The signed-in person at the foot of the sidebar: their name opens Account,
 * and the door beside it signs out in one click. While viewing as someone the
 * door gives way to the arrow back, so nobody signs out by mistake while
 * looking at another person's portal.
 */
export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const me = useMe();

  return (
    <div
      className={cn(
        'flex items-center gap-1 border-t border-border2 pt-2',
        collapsed && 'flex-col',
      )}
    >
      <Link
        href="/account"
        title={collapsed ? `${me.user.fullName}: your account` : 'Your account'}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-hover',
          collapsed && 'flex-none justify-center',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-7 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
        >
          {me.user.initials}
        </span>
        {collapsed ? (
          <span className="sr-only">{me.user.fullName}</span>
        ) : (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[12.5px] font-medium text-fg">{me.user.fullName}</span>
            <span className="truncate text-[11px] text-fg3">
              {me.roleLabels[0] ?? 'No access yet'}
            </span>
          </span>
        )}
      </Link>
      {me.impersonation ? <BackButton /> : <SignOutButton />}
    </div>
  );
}

const ICON_BUTTON =
  'flex size-8 flex-none items-center justify-center rounded-[8px] text-fg3 hover:bg-hover hover:text-fg disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      aria-label="Sign out"
      title="Sign out"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await clientApi('/auth/logout', { method: 'POST' }).catch(() => undefined);
        router.replace('/login');
        router.refresh();
      }}
      className={ICON_BUTTON}
    >
      <DoorIcon />
    </button>
  );
}

function BackButton() {
  const { stop, stopping } = useStopViewing();
  return (
    <button
      type="button"
      aria-label="Back to my view"
      title="Back to my view"
      disabled={stopping}
      onClick={() => void stop()}
      className={cn(ICON_BUTTON, 'text-warn-fg')}
    >
      <BackIcon />
    </button>
  );
}

/** An open door: the way out. */
function DoorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[16px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01" />
      <path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56Z" />
    </svg>
  );
}

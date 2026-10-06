'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useMe } from '@/lib/session';
import { BackIcon, useStopViewing } from './useStopViewing';

const minutesLeft = (expiresAt: string) =>
  Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000));

/**
 * Shown to the person doing the viewing, never to the person being viewed,
 * who is not told at all. It is impossible to miss: it stays above everything
 * on every page, the phone drawer included, the tab title says it too, and it
 * counts down to when it ends by itself. Its height is published as
 * --viewing-bar so the sidebar and the drawer start below it.
 */
export function ImpersonationBanner() {
  const me = useMe();
  const router = useRouter();
  const impersonation = me.impersonation;
  const [left, setLeft] = useState(() =>
    impersonation ? minutesLeft(impersonation.expiresAt) : 0,
  );
  const { stop, stopping } = useStopViewing();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--viewing-bar', `${el.offsetHeight}px`),
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--viewing-bar');
    };
  }, [impersonation]);

  useEffect(() => {
    if (!impersonation) return;
    // The bar is already on the page, hidden, when viewing starts from a click,
    // so the time left is set here too, not only when it first appears.
    setLeft(minutesLeft(impersonation.expiresAt));
    document.title = `[Viewing as ${me.user.fullName}] ${document.title}`;
    const timer = setInterval(() => {
      const remaining = minutesLeft(impersonation.expiresAt);
      setLeft(remaining);
      if (remaining <= 0) router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [impersonation, me.user.fullName, router]);

  if (!impersonation) return null;

  return (
    <div
      ref={bar}
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warn-br bg-warn-bg px-4 py-2 text-[12.5px] text-warn-fg"
    >
      <span>
        <strong className="font-semibold">Viewing as {me.user.fullName}</strong>
        {me.roleLabels.length > 0 && ` (${me.roleLabels.join(' · ')})`} · read-only · ends in {left}{' '}
        min
      </span>
      <Button
        size="sm"
        variant="secondary"
        loading={stopping}
        className="ml-auto"
        onClick={() => void stop()}
      >
        <span className="flex items-center gap-1.5">
          <BackIcon className="size-[14px]" />
          Back to my view
        </span>
      </Button>
    </div>
  );
}

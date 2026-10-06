'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { guideForPath } from '@/lib/guides';
import { useMe } from '@/lib/session';

/**
 * A round ? in the top bar. It opens the guide for the portal you are in, so
 * help is one click from the page you were stuck on, and the list of your
 * guides when none of them explains it.
 */
export function HelpButton() {
  const pathname = usePathname();
  const me = useMe();
  const guide = guideForPath(pathname, me.permissions);
  const label = guide ? `Help: ${guide.title}` : 'Help';

  return (
    <Link
      href={guide?.href ?? '/help'}
      aria-label="Help"
      title={label}
      className="flex size-7 items-center justify-center rounded-full text-fg2 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" />
        <path d="M12 17h.01" />
      </svg>
    </Link>
  );
}

import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { LabChannel } from './types';

/** Switch between the emails and the texts without going back to the sidebar. */
export function LabTabs({
  current,
  counts,
}: {
  current: LabChannel | 'overview';
  counts: { email: number; sms: number };
}) {
  const tabs = [
    { key: 'overview', label: 'Overview', href: '/dev/lab' },
    { key: 'EMAIL', label: `Email (${counts.email})`, href: '/dev/lab/email' },
    { key: 'SMS', label: `SMS (${counts.sms})`, href: '/dev/lab/sms' },
  ] as const;
  return (
    <nav aria-label="Comms lab" className="mb-4 flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium',
            t.key === current
              ? 'border-accent text-fg'
              : 'border-transparent text-fg2 hover:text-fg',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

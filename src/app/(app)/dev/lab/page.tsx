import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/lib/api/me';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { LabTabs } from '@/modules/dev/lab/LabTabs';
import { ModeSwitch } from '@/modules/dev/lab/ModeSwitch';
import type { LabOverview } from '@/modules/dev/lab/types';

export const metadata: Metadata = { title: 'Comms lab' };

/**
 * Every email and text the system sends, kept where a developer can read it,
 * and the one switch for where they go. Meant for testing before the email and
 * Beem accounts exist, and for checking what the system says at any time.
 */
export default async function CommsLabPage() {
  const me = await getMe();
  if (!can(me, 'dev.lab.read')) return <ForbiddenState what="the Comms lab" />;
  const overview = await serverApi<LabOverview>('/dev/lab');

  return (
    <>
      <PageHeader
        title="Comms lab"
        subtitle="Every email and text the system sends, kept here to read, and the switch for where they go."
      />
      <LabTabs current="overview" counts={overview.counts} />
      <div className="flex flex-col gap-4">
        <ModeSwitch overview={overview} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Email" href="/dev/lab/email" count={overview.counts.email} noun="email" />
          <Card title="SMS" href="/dev/lab/sms" count={overview.counts.sms} noun="text" />
        </div>
        <p className="text-[11.5px] text-fg3">
          Kept for 14 days. A message holds its one-time links and phone numbers in the clear, so
          this page is for the developer only. Messages sent as Live only are not kept.
        </p>
      </div>
    </>
  );
}

function Card({
  title,
  href,
  count,
  noun,
}: {
  title: string;
  href: string;
  count: number;
  noun: string;
}) {
  return (
    <Link href={href} className="rounded-[10px] border border-border bg-surface p-4 hover:bg-hover">
      <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-[22px] font-semibold text-fg">{count}</p>
      <p className="text-[11.5px] text-fg3">
        {noun}
        {count === 1 ? '' : 's'} kept. Open →
      </p>
    </Link>
  );
}

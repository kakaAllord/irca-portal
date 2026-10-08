import type { Metadata } from 'next';
import { getMe } from '@/lib/api/me';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { LabInbox } from '@/modules/dev/lab/LabInbox';
import { LabTabs } from '@/modules/dev/lab/LabTabs';
import { ModeSwitch } from '@/modules/dev/lab/ModeSwitch';
import type { LabOverview, LabPage } from '@/modules/dev/lab/types';

export const metadata: Metadata = { title: 'Comms lab: SMS' };

/** Everything the system sent as sms, newest first. */
export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'dev.lab.read')) return <ForbiddenState what="the Comms lab" />;
  const { before } = await searchParams;
  const query = new URLSearchParams({ channel: 'SMS', limit: '30' });
  if (before) query.set('before', before);
  const [overview, page] = await Promise.all([
    serverApi<LabOverview>('/dev/lab'),
    serverApi<LabPage>(`/dev/lab/messages?${query}`),
  ]);

  return (
    <>
      <PageHeader
        title="Comms lab: SMS"
        subtitle="Newest first. Each carries a badge: Dev only was kept here and sent nowhere; Dev + live was sent for real as well."
      />
      <LabTabs current="SMS" counts={overview.counts} />
      <div className="flex flex-col gap-4">
        <ModeSwitch overview={overview} />
        <LabInbox
          channel="SMS"
          rows={page.rows}
          next={page.next}
          timezone={me.church?.timezone ?? 'UTC'}
        />
      </div>
    </>
  );
}

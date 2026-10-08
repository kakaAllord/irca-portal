import type { Metadata } from 'next';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { ViewAsList } from '@/modules/dev/viewas/ViewAsList';

export const metadata: Metadata = { title: 'View-as log' };

export default async function ImpersonationsPage() {
  const me = await getMe();
  if (!can(me, 'dev.impersonations.read')) return <ForbiddenState what="the view-as log" />;

  return (
    <>
      <PageHeader
        title="View-as log"
        subtitle="Who opened the portal as someone else, when, and every page they saw. Nothing here can be changed, and nobody else can see it."
      />
      <ViewAsList timezone={me.church?.timezone ?? 'UTC'} />
    </>
  );
}

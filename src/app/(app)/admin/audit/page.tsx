import type { Metadata } from 'next';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { ActivityList } from './ActivityList';

export const metadata: Metadata = { title: 'Activity' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ActivityRow = {
  id: string;
  at: string;
  who: string;
  action: string;
  summary: string | null;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'admin.audit.read')) return <ForbiddenState what="the activity log" />;

  const params = await searchParams;
  const query = new URLSearchParams({ limit: '50' });
  if (params.action) query.set('action', params.action);
  // A hand-edited or stale address is ignored rather than turned into an error page.
  for (const key of ['from', 'to'] as const) {
    if (params[key] && ISO_DATE.test(params[key])) query.set(key, params[key]);
  }

  const { rows } = await serverApi<{ rows: ActivityRow[]; nextBefore: string | null }>(
    `/admin/audit?${query}`,
  );

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle={`Everything changed in ${me.church?.name ?? 'this church'}.`}
      />
      {rows.length === 0 ? (
        <EmptyState title="Nothing has been changed yet">
          Invitations, role changes and every record people add will appear here.
        </EmptyState>
      ) : (
        <ActivityList rows={rows} timezone={me.church?.timezone ?? 'UTC'} />
      )}
    </>
  );
}

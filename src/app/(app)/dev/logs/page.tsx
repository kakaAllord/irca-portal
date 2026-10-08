import type { Metadata } from 'next';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { LogsTerminal } from '@/modules/dev/logs/LogsTerminal';

export const metadata: Metadata = { title: 'Logs' };

/**
 * What the server wrote, and what people did, read by typing (docs/plan/11,
 * step 11.6). Anyone holding dev.logs.read sees every line: there is one
 * church, so there is nothing to narrow them to.
 */
export default async function LogsPage() {
  const me = await getMe();
  if (!can(me, 'dev.logs.read')) return <ForbiddenState what="the logs" />;

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle="What the server wrote, and what people did. Type help to see what you can ask."
      />
      <LogsTerminal timezone={me.church?.timezone ?? 'UTC'} />
    </>
  );
}

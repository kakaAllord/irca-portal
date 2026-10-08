import type { ReactNode } from 'react';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { Tabs } from './Tabs';

/**
 * What the system is used for, over time: the numbers the nightly job and
 * every request write into usage_daily, drawn per day.
 */
export default async function UsageLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!can(me, 'dev.usage.read')) return <ForbiddenState what="the usage pages" />;

  return (
    <>
      <PageHeader
        title="Usage"
        subtitle="What the system is used for, day by day. Counted as it happens, measured every night at 02:00."
      />
      <Tabs />
      <div className="mt-4">{children}</div>
    </>
  );
}

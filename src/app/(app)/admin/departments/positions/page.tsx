import type { Metadata } from 'next';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { AdminDepartmentsTabs } from '@/modules/departments/AdminDepartmentsTabs';
import { PositionsManager } from '@/modules/departments/PositionsManager';
import type { Position } from '@/modules/departments/types';

export const metadata: Metadata = { title: 'Positions' };

/** The leadership positions administrators keep: Chairperson, Secretary and the rest. */
export default async function PositionsPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'admin.departments.read')) return <ForbiddenState what="positions" />;
  const positions = await serverApi<Position[]>('/admin/leader-positions');

  return (
    <>
      <PageHeader
        title="Departments"
        subtitle="The church's departments and who leads them. Leaders add their own members."
      />
      <AdminDepartmentsTabs />
      <PositionsManager positions={positions} canManage={can(me, 'admin.departments.manage')} />
    </>
  );
}

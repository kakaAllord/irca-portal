import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { ApiRequestError } from '@/lib/api/errors';
import { DepartmentSummary } from '@/modules/departments/DepartmentSummary';
import { LeadersSection } from '@/modules/departments/LeadersSection';
import { MembersSection } from '@/modules/departments/MembersSection';
import { MyDepartmentsLink } from '@/modules/departments/MyDepartmentsLink';
import type {
  DepartmentDetail,
  DepartmentSummary as Summary,
  SummaryPeriod,
} from '@/modules/departments/types';
import { DepartmentTabs } from '@/modules/departments/DepartmentTabs';

export const metadata: Metadata = { title: 'Department' };

const PERIODS: SummaryPeriod[] = ['this_month', 'last_month', 'this_year'];

/**
 * One department. Its leaders see who leads it and keep its members. The
 * pastors and administrators, who oversee every department (D35), see its
 * summary, its leaders by position and its members, all read-only, with an
 * arrow beside anyone they may view as; administrators change it in Admin.
 */
export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period } = await searchParams;
  const me = await serverApi<MeResponse>('/auth/me');
  const oversees = can(me, 'departments.all.read') || can(me, 'admin.departments.read');
  if (!can(me, 'departments.own.read') && !oversees) {
    return <ForbiddenState what="departments" />;
  }

  let department: DepartmentDetail;
  try {
    department = await serverApi<DepartmentDetail>(`/departments/${id}`);
  } catch (err) {
    // Someone else's department is simply not theirs to open.
    if (err instanceof ApiRequestError && err.status === 403) {
      return <ForbiddenState what="this department" />;
    }
    throw err;
  }
  const asked = PERIODS.includes(period as SummaryPeriod) ? period : 'this_month';
  const summary = can(me, 'departments.summary.read')
    ? await serverApi<Summary>(`/departments/${id}/summary?period=${asked}`)
    : null;
  const leads = department.youLead;

  return (
    <>
      {leads && <MyDepartmentsLink />}
      <div className={leads ? 'mt-2' : undefined}>
        <PageHeader
          title={department.name}
          subtitle={department.description || undefined}
          actions={
            can(me, 'admin.departments.read') && (
              <Link
                href={`/admin/departments/${department.id}`}
                className="rounded-[7px] border border-border px-3 py-1.5 text-[12px] font-medium text-fg2 hover:bg-hover"
              >
                Manage in Admin
              </Link>
            )
          }
        />
      </div>
      {leads && <DepartmentTabs id={department.id} />}
      <div className="flex flex-col gap-7">
        {summary && <DepartmentSummary summary={summary} me={me} path={`/departments/${id}`} />}
        {leads ? (
          <>
            <MembersSection department={department} permission="departments.own.members" />
            <LeadersSection department={department} readOnly />
          </>
        ) : (
          <>
            <LeadersSection department={department} readOnly />
            <MembersSection department={department} permission="departments.own.members" readOnly />
          </>
        )}
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { Alert } from '@/components/ui/Alert';
import { ArchiveButton } from '@/modules/departments/ArchiveButton';
import { DepartmentDrawer } from '@/modules/departments/DepartmentDrawer';
import { LeadersSection } from '@/modules/departments/LeadersSection';
import { MembersSection } from '@/modules/departments/MembersSection';
import { DepartmentSummary } from '@/modules/departments/DepartmentSummary';
import type {
  DepartmentDetail,
  DepartmentRow,
  DepartmentSummary as Summary,
  SummaryPeriod,
} from '@/modules/departments/types';
import { portalChoices } from '@/modules/departments/portals';

export const metadata: Metadata = { title: 'Department' };

const PERIODS: SummaryPeriod[] = ['this_month', 'last_month', 'this_year'];

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period } = await searchParams;
  const me = await getMe();
  if (!can(me, 'admin.departments.read')) return <ForbiddenState what="departments" />;

  const [department, all] = await Promise.all([
    serverApi<DepartmentDetail>(`/departments/${id}`),
    serverApi<DepartmentRow[]>('/admin/departments'),
  ]);
  const manage = can(me, 'admin.departments.manage');
  // Administrators oversee every department, so they see its numbers too.
  const asked = PERIODS.includes(period as SummaryPeriod) ? period : 'this_month';
  const summary = can(me, 'departments.summary.read')
    ? await serverApi<Summary>(`/departments/${id}/summary?period=${asked}`)
    : null;

  return (
    <>
      <Link href="/admin/departments" className="text-[12px] text-fg2 hover:text-fg">
        ← Departments
      </Link>
      <div className="mt-2">
        <PageHeader
          title={department.name}
          subtitle={
            department.description ||
            (department.portal
              ? `Its portal is ${department.portal.name}.`
              : 'It has no portal of its own.')
          }
          actions={
            manage && (
              <>
                {!department.archived && (
                  <DepartmentDrawer
                    department={{
                      id: department.id,
                      name: department.name,
                      description: department.description,
                      portalKey: department.portal?.key ?? null,
                    }}
                    portals={portalChoices(all)}
                  />
                )}
                <ArchiveButton
                  id={department.id}
                  name={department.name}
                  archived={department.archived}
                />
              </>
            )
          }
        />
      </div>

      {department.archived && (
        <div className="mb-4">
          <Alert tone="warn">
            Archived. Its leaders cannot see it or send its messages until it is restored.
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-7">
        {summary && (
          <DepartmentSummary summary={summary} me={me} path={`/admin/departments/${id}`} />
        )}
        <LeadersSection department={department} />
        <MembersSection department={department} permission="admin.departments.manage" />
      </div>
    </>
  );
}

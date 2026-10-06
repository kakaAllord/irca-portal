import type { Metadata } from 'next';
import Link from 'next/link';
import { moduleByKey, type MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = { title: 'Departments' };

/**
 * Every department, for the pastors and administrators who oversee them
 * (14.2). The sidebar lists the same under Departments; this page is the
 * same list with room to read, and where a phone lands.
 */
export default async function AllDepartmentsPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'departments.all.read')) return <ForbiddenState what="every department" />;
  const departments = me.departments ?? [];

  return (
    <>
      <PageHeader
        title="Departments"
        subtitle="Each department's leaders, members and what is happening there, to read."
      />
      {departments.length === 0 ? (
        <EmptyState title="No departments yet">
          An administrator adds them in Admin → Departments.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <li key={d.id}>
              <Link
                href={`/departments/${d.id}`}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-border bg-surface p-3.5 hover:border-accent-br"
              >
                <span className="font-medium text-fg">{d.name}</span>
                {d.moduleKey && (
                  <Badge tone="muted">{moduleByKey(d.moduleKey)?.name ?? d.moduleKey}</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

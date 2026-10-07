import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import type { PersonRow } from '@/modules/membership/types';
import { PeopleFilters } from '@/modules/membership/components/PeopleFilters';
import { MembersTable } from './MembersTable';
import { MembersActions } from './MembersActions';

export const metadata: Metadata = { title: 'Registrations' };

type Listed = { rows: PersonRow[]; total: number; tabCounts: Record<string, number> };

const KEYS = ['tab', 'q', 'salvation', 'baptism', 'gender', 'age', 'lives', 'source'] as const;
const PAGE_SIZE = 50;

const TABS = [
  ['all', 'All'],
  ['joining', 'Joining church'],
  ['salvation', 'Salvation'],
  ['baptism', 'Baptism'],
  ['volunteers', 'Volunteers'],
  ['new_converts', 'New converts'],
  ['incomplete', 'Incomplete'],
] as const;

/**
 * Everyone who has ever registered, and everyone added by hand, filtered as
 * you type. Confirmed members also have a page of their own, Members.
 */
export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'membership.people.read'))
    return <ForbiddenState what="the people of this church" />;

  const params = await searchParams;
  // Opens on those who want to join the church; All is one tap away.
  const query = new URLSearchParams({ tab: params.tab ?? 'joining' });
  for (const key of KEYS) if (params[key]) query.set(key, params[key]);
  const page = Math.max(1, Number(params.page) || 1);
  const data = await serverApi<Listed>(
    `/membership/people?${query}&page=${page}&pageSize=${PAGE_SIZE}`,
  );

  const tab = params.tab ?? 'joining';

  return (
    <>
      <PageHeader
        title="Registrations"
        subtitle="Everyone who has registered, and everyone an administrator has added."
        actions={<MembersActions query={query.toString()} />}
      />
      <PeopleFilters
        path="/membership/people"
        tabs={TABS}
        defaultTab="joining"
        counts={data.tabCounts}
        shown={data.rows.length}
        total={data.total}
      />
      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState title="Nobody matches these filters.">
            <Link href="/membership/people" className="text-accent underline">
              Clear them
            </Link>
          </EmptyState>
        ) : (
          <MembersTable rows={data.rows} tab={tab} />
        )}
        <Pager
          path="/membership/people"
          params={query}
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
        />
      </div>
    </>
  );
}

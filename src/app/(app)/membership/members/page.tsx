import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import { PeopleFilters } from '@/modules/membership/components/PeopleFilters';
import { type PersonRow } from '@/modules/membership/types';
import { MembersActions } from '../people/MembersActions';
import { MembersList } from './MembersList';

export const metadata: Metadata = { title: 'Members' };

type Listed = { rows: PersonRow[]; total: number };

const KEYS = ['q', 'baptism', 'gender', 'age', 'lives'] as const;
const PAGE_SIZE = 50;

/**
 * The church's confirmed members, by member number. Everyone else who has
 * registered is on Registrations; someone appears here once the pastors
 * confirm their application. A row opens in place, as on Registrations.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!can(me, 'membership.people.read')) return <ForbiddenState what="the members" />;

  const params = await searchParams;
  const query = new URLSearchParams({ members: '1' });
  for (const key of KEYS) if (params[key]) query.set(key, params[key]);
  const page = Math.max(1, Number(params.page) || 1);
  const data = await serverApi<Listed>(
    `/membership/people?${query}&page=${page}&pageSize=${PAGE_SIZE}`,
  );
  const filters = new URLSearchParams(query);
  filters.delete('members');

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Everyone the pastors have confirmed as a member, with their member number."
        actions={<MembersActions query={query.toString()} adding={false} />}
      />
      <PeopleFilters
        path="/membership/members"
        fields={['baptism', 'gender', 'age', 'lives']}
        shown={data.rows.length}
        total={data.total}
      />
      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState title="No member matches these filters.">
            <Link href="/membership/members" className="text-accent underline">
              Clear them
            </Link>
          </EmptyState>
        ) : (
          <MembersList rows={data.rows} />
        )}
        <Pager
          path="/membership/members"
          params={filters}
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
        />
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import { Table, Row, Cell } from '@/components/ui/Table';
import { PeopleFilters } from '@/modules/membership/components/PeopleFilters';
import { day, type PersonRow } from '@/modules/membership/types';
import { MembersActions } from '../people/MembersActions';

export const metadata: Metadata = { title: 'Members' };

type Listed = { rows: PersonRow[]; total: number };

const KEYS = ['q', 'baptism', 'gender', 'age', 'lives'] as const;
const PAGE_SIZE = 50;

/**
 * The church's confirmed members, by member number. Everyone else who has
 * registered is on Registrations; someone appears here once the pastors
 * confirm their application.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
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
          <Table head={['No.', 'Member', 'Phone', 'Gender and age', 'Lives in', 'Confirmed']}>
            {data.rows.map((m) => (
              <Row key={m.id}>
                <Cell className="tabular-nums text-fg2">{m.memberNumber ?? '—'}</Cell>
                <Cell>
                  <Link
                    href={`/membership/people/${m.id}`}
                    className="flex items-center gap-2.5 font-medium text-fg hover:underline"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-7 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
                    >
                      {m.initials}
                    </span>
                    {m.fullName || 'Unknown'}
                  </Link>
                </Cell>
                <Cell className="tabular-nums text-fg2">{m.phone || '—'}</Cell>
                <Cell className="text-fg2">
                  {[m.gender, m.ageGroup].filter(Boolean).join(' · ') || '—'}
                </Cell>
                <Cell className="text-fg2">{m.livesIn || '—'}</Cell>
                <Cell className="text-fg2">{m.confirmedAt ? day(m.confirmedAt) : '—'}</Cell>
              </Row>
            ))}
          </Table>
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

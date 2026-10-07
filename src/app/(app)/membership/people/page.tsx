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

  // On these two tabs, everyone who has not finished can be texted at once,
  // each with their own link and in the language they chose on the form.
  const tab = params.tab ?? 'joining';
  const remindAll =
    can(me, 'comms.messages.send') && (tab === 'incomplete' || tab === 'joining')
      ? tab === 'joining'
        ? 'membership.unfinished_joining'
        : 'membership.unfinished'
      : null;

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
      {remindAll && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[12.5px] text-fg2">
          <span>
            {tab === 'joining'
              ? 'Remind everyone here who wants to join but has not finished the form.'
              : 'Remind everyone who has not finished the form.'}{' '}
            Each is greeted in the language they used and sent their own link.
          </span>
          <Link
            href={`/comms/compose?audience=${remindAll}`}
            className="inline-flex h-8 items-center rounded-[7px] bg-btn-bg px-3 text-[12.5px] font-medium text-btn-fg hover:opacity-90"
          >
            Text them all
          </Link>
        </div>
      )}
      <div className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState title="Nobody matches these filters.">
            <Link href="/membership/people" className="text-accent underline">
              Clear them
            </Link>
          </EmptyState>
        ) : (
          <MembersTable rows={data.rows} />
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import { PeopleFilters } from '@/modules/membership/components/PeopleFilters';
import type { PersonRow } from '@/modules/membership/types';
import { SalvationList, type Need } from './SalvationList';

export const metadata: Metadata = { title: 'Salvation & baptism' };

type Listed = { rows: PersonRow[]; total: number; tabCounts: Record<string, number> };

const PAGE_SIZE = 50;

const LISTS: { key: Need; label: string; hint: string }[] = [
  {
    key: 'salvation',
    label: 'Need salvation',
    hint: 'Asked to give their life to Christ, or said they are not saved yet.',
  },
  {
    key: 'baptism',
    label: 'Need baptism',
    hint: 'Saved, or asked to be baptised, and not baptised yet.',
  },
];

/**
 * Who still needs salvation, and who needs baptism (D61): the pastors' own
 * list. One switch moves a person on: from salvation to baptism, and from
 * baptism off the list. Nothing else to learn.
 */
export default async function SalvationPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string; q?: string; page?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'membership.people.read'))
    return <ForbiddenState what="the people of this church" />;

  const params = await searchParams;
  const list: Need = params.list === 'baptism' ? 'baptism' : 'salvation';
  const page = Math.max(1, Number(params.page) || 1);
  const query = new URLSearchParams({ tab: `needs_${list}` });
  if (params.q) query.set('q', params.q);
  const data = await serverApi<Listed>(
    `/membership/people?${query}&page=${page}&pageSize=${PAGE_SIZE}`,
  );

  // The address of a list, keeping the search.
  const link = (key: Need) => {
    const next = new URLSearchParams();
    if (key === 'baptism') next.set('list', 'baptism');
    if (params.q) next.set('q', params.q);
    return `/membership/salvation${next.size ? `?${next}` : ''}`;
  };
  const pagerParams = new URLSearchParams();
  if (list === 'baptism') pagerParams.set('list', 'baptism');
  if (params.q) pagerParams.set('q', params.q);

  return (
    <>
      <PageHeader
        title="Salvation & baptism"
        subtitle="Everyone who still needs salvation or baptism. Flip the switch when it has happened, and they move on."
      />

      <nav aria-label="Lists" className="mb-4 grid gap-2 sm:grid-cols-2">
        {LISTS.map((l) => {
          const on = l.key === list;
          return (
            <Link
              key={l.key}
              href={link(l.key)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex flex-col gap-0.5 rounded-[10px] border px-4 py-3',
                on ? 'border-accent-br bg-chip' : 'border-border bg-surface hover:bg-hover',
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold text-fg">{l.label}</span>
                <span className="text-[20px] font-semibold tabular-nums text-fg">
                  {(data.tabCounts[`needs_${l.key}`] ?? 0).toLocaleString('en-GB')}
                </span>
              </span>
              <span className="text-[11.5px] text-fg3">{l.hint}</span>
            </Link>
          );
        })}
      </nav>

      <PeopleFilters
        path="/membership/salvation"
        fields={[]}
        shown={data.rows.length}
        total={data.total}
      />
      <div className="mt-4">
        {/* Keyed, so someone just moved is not still hidden on the other list. */}
        <SalvationList key={list} rows={data.rows} need={list} />
        <Pager
          path="/membership/salvation"
          params={pagerParams}
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
        />
      </div>
    </>
  );
}

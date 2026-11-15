import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Pager } from '@/components/ui/Pager';
import { Table, Row, Cell } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { STAGE_LABEL, type Group, type Stage } from '@/modules/membership/types';
import { GroupPicker } from './GroupPicker';
import { NewSession } from './NewSession';
import { NewGroup } from './NewGroup';
import { Sessions, type NoticeData, type SessionsData } from './Sessions';

export const metadata: Metadata = { title: 'Discipleship' };

type Card = {
  personId: string;
  fullName: string;
  initials: string;
  group: string | null;
  enrollmentId: string | null;
  baptised: boolean;
  memberNumber: number | null;
};
type Listed = {
  counts: { stage: Stage; count: number }[];
  total: number;
  rows: (Card & { stage: Stage })[];
};

const VIEWS = ['table', 'sessions'] as const;
type View = (typeof VIEWS)[number];
const PAGE_SIZE = 50;

/**
 * From the decision to follow Christ to full membership. A group of new
 * converts meets on its own day and Meet link, and its sessions are chosen
 * with the group at the top. Attendance is not kept (D61): someone finishes
 * the class when they are moved on to awaiting baptism from their record.
 */
export default async function DiscipleshipPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string; stage?: string; page?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'membership.discipleship.read'))
    return <ForbiddenState what="the foundation class" />;

  const params = await searchParams;
  const view: View = VIEWS.find((v) => v === params.view) ?? 'table';
  const people = view === 'table';
  const groups = await serverApi<Group[]>('/membership/discipleship/groups');
  const active = groups.filter((g) => g.isActive);
  const group = params.group ?? (people ? undefined : active[0]?.id);
  const stage = people && params.stage && params.stage in STAGE_LABEL ? params.stage : '';
  const page = Math.max(1, Number(params.page) || 1);

  const listed =
    view === 'table'
      ? await serverApi<Listed>(
          `/membership/discipleship/table?${new URLSearchParams({
            ...(group ? { group } : {}),
            ...(stage ? { stage } : {}),
            page: String(page),
            pageSize: String(PAGE_SIZE),
          })}`,
        )
      : null;
  const sessions =
    view === 'sessions' && group
      ? await serverApi<SessionsData>(`/membership/discipleship/groups/${group}/sessions`)
      : null;
  const notice = can(me, 'membership.discipleship.manage')
    ? await serverApi<NoticeData>('/membership/discipleship/session-notice')
    : null;

  /** The page's address for a view, group or stage, keeping the rest. */
  const query = (next: { view?: View; group?: string; stage?: string }) => {
    const q = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== 'table') q.set('view', v);
    const g = 'group' in next ? next.group : group;
    if (g) q.set('group', g);
    const s = 'stage' in next ? next.stage : stage;
    if (s && v === 'table') q.set('stage', s);
    return q;
  };
  const link = (next: Parameters<typeof query>[0]) => {
    const q = query(next);
    return `/membership/discipleship${q.size ? `?${q}` : ''}`;
  };

  const pill = (on: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-[12px]',
      on ? 'border-accent-br bg-chip text-fg' : 'border-border text-fg2 hover:bg-hover',
    );

  return (
    <>
      <PageHeader
        title="Discipleship"
        subtitle="Every new convert from the decision to full membership."
        actions={
          <>
            <NewGroup />
            <NewSession groups={active} groupId={group} notice={notice} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {(people || active.length > 0) && (
            <GroupPicker
              value={link({})}
              options={[
                ...(people ? [{ value: link({ group: '' }), label: 'All groups' }] : []),
                ...active.map((g) => ({ value: link({ group: g.id }), label: g.name })),
              ]}
            />
          )}
          <nav aria-label="Views" className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['table', 'People', people],
                ['sessions', 'Sessions', view === 'sessions'],
              ] as const
            ).map(([key, label, on]) => (
              <Link
                key={key}
                href={link({ view: key })}
                aria-current={on ? 'page' : undefined}
                className={pill(on)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {listed && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Link href={link({ stage: '' })} className={pill(!stage)}>
              All <span className="text-fg3 tabular-nums">{sum(listed.counts)}</span>
            </Link>
            {listed.counts.map((c) => (
              <Link
                key={c.stage}
                href={link({ stage: c.stage })}
                className={pill(stage === c.stage)}
              >
                {STAGE_LABEL[c.stage]} <span className="text-fg3 tabular-nums">{c.count}</span>
              </Link>
            ))}
          </div>
          {listed.rows.length === 0 ? (
            <EmptyState title="Nobody here yet." />
          ) : (
            <Table head={['Person', 'Stage', 'Group', 'Baptised']}>
              {listed.rows.map((r) => (
                <Row key={r.personId}>
                  <Cell>
                    <Link
                      href={`/membership/people/${r.personId}`}
                      className="flex items-center gap-2.5 font-medium text-fg hover:underline"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-7 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
                      >
                        {r.initials}
                      </span>
                      {r.fullName}
                    </Link>
                  </Cell>
                  <Cell nowrap className="text-fg2">
                    {STAGE_LABEL[r.stage]}
                    {r.memberNumber && <span className="text-fg3"> · No. {r.memberNumber}</span>}
                  </Cell>
                  <Cell className="text-fg2">{r.group ?? 'None'}</Cell>
                  <Cell className="text-fg2">{r.baptised ? 'Yes' : 'Not yet'}</Cell>
                </Row>
              ))}
            </Table>
          )}
          <Pager
            path="/membership/discipleship"
            params={query({})}
            page={page}
            pageSize={PAGE_SIZE}
            total={listed.total}
          />
        </>
      )}

      {view === 'sessions' &&
        (sessions ? (
          <Sessions data={sessions} />
        ) : (
          <EmptyState title="No groups yet">
            Start a group with + New group, then add its sessions with + New session.
          </EmptyState>
        ))}
    </>
  );
}

const sum = (counts: { count: number }[]) => counts.reduce((n, c) => n + c.count, 0);

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
import { NewGroup, Register } from './Register';
import { Sessions, type NoticeData, type SessionsData } from './Sessions';

export const metadata: Metadata = { title: 'Discipleship' };

type Card = {
  personId: string;
  fullName: string;
  initials: string;
  group: string | null;
  enrollmentId: string | null;
  progress: { attended: number; of: number } | null;
  atRisk: boolean;
  baptised: boolean;
  memberNumber: number | null;
  readyToApply: boolean;
};
type Board = { sessions: number; columns: { stage: Stage; count: number; cards: Card[] }[] };
type Listed = {
  sessions: number;
  counts: { stage: Stage; count: number }[];
  total: number;
  rows: (Card & { stage: Stage })[];
};
export type RegisterData = {
  sessions: number;
  /** How many attended sessions finish the class. */
  needed: number;
  /** When each numbered session was, for those that have a date. */
  dates: Record<string, string>;
  rows: {
    enrollmentId: string;
    personId: string;
    fullName: string;
    initials: string;
    completed: boolean;
    marks: ('ATTENDED' | 'MISSED' | null)[];
    attended: number;
    atRisk: boolean;
  }[];
};

const VIEWS = ['board', 'table', 'sessions', 'register'] as const;
type View = (typeof VIEWS)[number];
const PAGE_SIZE = 50;

/** Where someone is in the class, in a few words, on a card or a row. */
const about = (card: Card) =>
  [
    card.group,
    card.progress && `${card.progress.attended} of ${card.progress.of} sessions`,
    card.memberNumber && `Member ${card.memberNumber}`,
  ]
    .filter(Boolean)
    .join(' · ') || (card.baptised ? 'Baptised' : 'Not in a class yet');

/**
 * From the decision to follow Christ to full membership. A group of new
 * converts meets on its own day and Meet link; its sessions, and the
 * attendance counted for it, are chosen with the group at the top.
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
  const view: View = VIEWS.find((v) => v === params.view) ?? 'board';
  const people = view === 'board' || view === 'table';
  const groups = await serverApi<Group[]>('/membership/discipleship/groups');
  const active = groups.filter((g) => g.isActive);
  const group = params.group ?? (people ? undefined : active[0]?.id);
  const stage = view === 'table' && params.stage && params.stage in STAGE_LABEL ? params.stage : '';
  const page = Math.max(1, Number(params.page) || 1);

  const board =
    view === 'board'
      ? await serverApi<Board>(`/membership/discipleship/board${group ? `?group=${group}` : ''}`)
      : null;
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
  const register =
    view === 'register' && group
      ? await serverApi<RegisterData>(`/membership/discipleship/register?group=${group}`)
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
    if (v !== 'board') q.set('view', v);
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
                ['board', 'People', people],
                ['sessions', 'Sessions', view === 'sessions'],
                ['register', 'Class register', view === 'register'],
              ] as const
            ).map(([key, label, on]) => (
              <Link
                key={key}
                href={link({ view: key === 'board' && view === 'table' ? 'table' : key })}
                aria-current={on ? 'page' : undefined}
                className={pill(on)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {people && (
          <div
            role="group"
            aria-label="Show people as"
            className="inline-flex rounded-[8px] border border-border p-0.5"
          >
            {(
              [
                ['board', 'Board'],
                ['table', 'Table'],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={link({ view: key })}
                aria-current={view === key ? 'page' : undefined}
                className={cn(
                  'rounded-[6px] px-3 py-1 text-[12px]',
                  view === key ? 'bg-chip font-medium text-fg' : 'text-fg2 hover:bg-hover',
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {board && (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-5">
          {board.columns.map((column) => (
            <section
              key={column.stage}
              className="flex min-w-[200px] flex-col gap-2 rounded-[10px] bg-surface2 p-2.5"
            >
              <h2 className="flex items-center justify-between px-1 text-[12px] font-semibold text-fg">
                {STAGE_LABEL[column.stage]}
                <span className="text-fg3 tabular-nums">{column.count}</span>
              </h2>
              {column.cards.length === 0 && (
                <p className="px-1 text-[11.5px] text-fg3">Nobody yet.</p>
              )}
              {column.cards.map((card) => (
                <Link
                  key={card.personId}
                  href={`/membership/people/${card.personId}`}
                  className="flex flex-col gap-1 rounded-[8px] border border-border bg-surface p-2.5 hover:border-accent-br"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex size-6 flex-none items-center justify-center rounded-full bg-chip text-[10px] font-semibold text-fg2"
                    >
                      {card.initials}
                    </span>
                    <span className="truncate text-[12.5px] font-medium text-fg">
                      {card.fullName}
                    </span>
                  </span>
                  <span className="text-[11px] text-fg3">{about(card)}</span>
                  {card.atRisk && (
                    <span className="text-[11px] text-warn-fg">
                      Missed two in a row — worth a visit
                    </span>
                  )}
                  {card.readyToApply && (
                    <span className="text-[11px] text-pos">Ready to apply</span>
                  )}
                </Link>
              ))}
              {column.count > column.cards.length && (
                <Link
                  href={link({ view: 'table', stage: column.stage })}
                  className="px-1 text-[11.5px] text-accent hover:underline"
                >
                  All {column.count} in the table
                </Link>
              )}
            </section>
          ))}
        </div>
      )}

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
            <Table head={['Person', 'Stage', 'Group', 'Class', 'Baptised', '']}>
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
                  <Cell nowrap className="tabular-nums text-fg2">
                    {r.progress ? `${r.progress.attended} of ${r.progress.of}` : 'Not started'}
                  </Cell>
                  <Cell className="text-fg2">{r.baptised ? 'Yes' : 'Not yet'}</Cell>
                  <Cell nowrap>
                    {r.atRisk && (
                      <span className="text-[11.5px] text-warn-fg">Missed two in a row</span>
                    )}
                    {r.readyToApply && (
                      <span className="text-[11.5px] text-pos">Ready to apply</span>
                    )}
                  </Cell>
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

      {view === 'register' &&
        (register ? (
          <Register groupId={group!} data={register} />
        ) : (
          <EmptyState title="No groups yet">
            Start a group, then sign people up from their record.
          </EmptyState>
        ))}
    </>
  );
}

const sum = (counts: { count: number }[]) => counts.reduce((n, c) => n + c.count, 0);

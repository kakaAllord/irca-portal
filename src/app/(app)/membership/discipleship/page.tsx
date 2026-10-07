import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
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

const VIEWS = ['board', 'sessions', 'register'] as const;
type View = (typeof VIEWS)[number];

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
  searchParams: Promise<{ view?: string; group?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'membership.discipleship.read'))
    return <ForbiddenState what="the foundation class" />;

  const params = await searchParams;
  const view: View = VIEWS.find((v) => v === params.view) ?? 'board';
  const people = view === 'board';
  const groups = await serverApi<Group[]>('/membership/discipleship/groups');
  const active = groups.filter((g) => g.isActive);
  const group = params.group ?? (people ? undefined : active[0]?.id);

  const board =
    view === 'board'
      ? await serverApi<Board>(`/membership/discipleship/board${group ? `?group=${group}` : ''}`)
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
  const query = (next: { view?: View; group?: string }) => {
    const q = new URLSearchParams();
    const v = next.view ?? view;
    if (v !== 'board') q.set('view', v);
    const g = 'group' in next ? next.group : group;
    if (g) q.set('group', g);
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
            </section>
          ))}
        </div>
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

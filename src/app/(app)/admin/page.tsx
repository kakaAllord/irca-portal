import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, type MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';

export const metadata: Metadata = { title: 'Overview' };

type Overview = {
  waiting: {
    changeRequests: number;
    templates: number;
    emergencyMessages: number;
    emergencyWaitedMinutes: number | null;
    emergencyUrgent: boolean;
    applications: number;
  };
  people: {
    registeredThisWeek: number;
    registeredThisMonth: number;
    unfinishedRegistrations: number;
    confirmedMembers: number;
    newInFoundationClass: number;
  };
  departments: {
    count: number;
    finance: string | null;
    comms: string | null;
    withoutLeader: { id: string; name: string }[];
    portalWithoutMembers: { id: string; name: string }[];
  };
  comms: { texts: number; failed: number; credit: number | null };
  finance: {
    income: string;
    expenses: string;
    /** Departments near or over their budget this month (D40). */
    budgets: { month: string; over: string[]; near: string[] };
  };
  accounts: { invitationsNotAccepted: number; invitationDays: number; disabled: number };
  system: { allWell: boolean };
};

/**
 * Admin → Overview (D45): what needs an administrator, each number a link to
 * where it is handled. The administrator's home.
 */
export default async function AdminOverviewPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'admin.overview.read')) return <ForbiddenState what="the overview" />;
  const o = await serverApi<Overview>('/admin/overview');
  const currency = me.church?.currency ?? 'TZS';
  const n = (v: number) => v.toLocaleString('en-GB');
  const link = (href: string, permission: string) => (can(me, permission) ? href : undefined);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="What needs an administrator, across the church."
        actions={
          <a
            href="/api/admin/overview/pdf"
            className="inline-flex h-9 items-center rounded-[7px] border border-border px-3.5 text-[12.5px] font-medium text-fg hover:bg-hover"
          >
            Download PDF
          </a>
        }
      />
      <div className="flex flex-col gap-6">
        <Group title="Waiting for you">
          <Tile
            label="Change requests"
            value={n(o.waiting.changeRequests)}
            href={link('/admin/requests?tab=changes', 'admin.requests.read')}
            attention={o.waiting.changeRequests > 0}
          />
          <Tile
            label="Templates to approve"
            value={n(o.waiting.templates)}
            href={link('/admin/requests?tab=templates', 'admin.requests.read')}
            attention={o.waiting.templates > 0}
          />
          <Tile
            label="Emergency messages"
            value={n(o.waiting.emergencyMessages)}
            note={
              o.waiting.emergencyWaitedMinutes !== null
                ? `The oldest has waited ${waited(o.waiting.emergencyWaitedMinutes)}`
                : undefined
            }
            href={link('/admin/requests?tab=messages', 'admin.requests.read')}
            attention={o.waiting.emergencyMessages > 0}
            urgent={o.waiting.emergencyUrgent}
          />
          <Tile
            label="Membership applications"
            value={n(o.waiting.applications)}
            note="Decided by the pastors or an administrator"
            href={link('/membership/applications', 'membership.applications.read')}
            attention={o.waiting.applications > 0}
          />
        </Group>

        <Group title="People">
          <Tile
            label="Registered this week"
            value={n(o.people.registeredThisWeek)}
            href={link('/membership', 'membership.dashboard.read')}
          />
          <Tile
            label="Registered this month"
            value={n(o.people.registeredThisMonth)}
            href={link('/membership', 'membership.dashboard.read')}
          />
          <Tile
            label="Registrations not finished"
            value={n(o.people.unfinishedRegistrations)}
            href={link('/membership/people?tab=incomplete', 'membership.people.read')}
          />
          <Tile
            label="Confirmed members"
            value={n(o.people.confirmedMembers)}
            href={link('/membership/people', 'membership.people.read')}
          />
          <Tile
            label="New in the foundation class"
            value={n(o.people.newInFoundationClass)}
            note="This month"
            href={link('/membership/discipleship', 'membership.discipleship.read')}
          />
        </Group>

        <Group title="Departments">
          <Tile
            label="Departments"
            value={n(o.departments.count)}
            href={link('/admin/departments', 'admin.departments.read')}
          />
          <Tile
            label="With no leader"
            value={n(o.departments.withoutLeader.length)}
            note={names(o.departments.withoutLeader)}
            href={link(first(o.departments.withoutLeader), 'admin.departments.read')}
            attention={o.departments.withoutLeader.length > 0}
          />
          <Tile
            label="Portals nobody is in"
            value={n(o.departments.portalWithoutMembers.length)}
            note={names(o.departments.portalWithoutMembers)}
            href={link(first(o.departments.portalWithoutMembers), 'admin.departments.read')}
            attention={o.departments.portalWithoutMembers.length > 0}
          />
        </Group>

        <Group title="This month">
          <Tile
            label="Income"
            value={formatMoney(o.finance.income, currency)}
            href={o.departments.finance ? `/departments/${o.departments.finance}` : undefined}
          />
          <Tile
            label="Expenses"
            value={formatMoney(o.finance.expenses, currency)}
            href={o.departments.finance ? `/departments/${o.departments.finance}` : undefined}
          />
          <Tile
            label="Departments over their budget"
            value={n(o.finance.budgets.over.length)}
            note={
              [
                o.finance.budgets.over.join(', '),
                o.finance.budgets.near.length > 0 &&
                  `Nearly there: ${o.finance.budgets.near.join(', ')}`,
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
            href={o.departments.finance ? `/departments/${o.departments.finance}` : undefined}
            attention={o.finance.budgets.over.length > 0}
          />
          <Tile
            label="Texts sent"
            value={n(o.comms.texts)}
            href={o.departments.comms ? `/departments/${o.departments.comms}` : undefined}
          />
          <Tile
            label="Texts that failed"
            value={n(o.comms.failed)}
            href={o.departments.comms ? `/departments/${o.departments.comms}` : undefined}
          />
          <Tile
            label="Credit left at Beem"
            value={o.comms.credit === null ? 'Not known yet' : n(o.comms.credit)}
          />
        </Group>

        <Group title="Accounts">
          <Tile
            label="Invitations not accepted"
            value={n(o.accounts.invitationsNotAccepted)}
            note={`Sent more than ${o.accounts.invitationDays} days ago`}
            href={link('/admin/users?status=INVITED', 'admin.users.read')}
          />
          <Tile
            label="Access disabled"
            value={n(o.accounts.disabled)}
            href={link('/admin/users?status=DISABLED', 'admin.users.read')}
          />
        </Group>

        <p
          className={cn(
            'flex items-center gap-2 text-[12.5px]',
            o.system.allWell ? 'text-fg2' : 'font-medium text-danger',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('size-2 rounded-full', o.system.allWell ? 'bg-pos' : 'bg-danger')}
          />
          {o.system.allWell
            ? 'The system: all well.'
            : 'The system: something needs the developer. They have been told.'}
        </p>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Tile({
  label,
  value,
  note,
  href,
  attention = false,
  urgent = false,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  /** Something is waiting: the number is drawn in the accent. */
  attention?: boolean;
  /** Waiting too long: a red edge (an emergency message after 15 minutes). */
  urgent?: boolean;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-[19px] font-semibold tabular-nums',
          urgent ? 'text-danger' : attention ? 'text-accent' : 'text-fg',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-[11.5px] text-fg3">{note}</p>}
    </>
  );
  const box = cn(
    'rounded-[10px] border bg-surface p-3.5',
    urgent ? 'border-danger border-l-4' : 'border-border',
  );
  return href ? (
    <Link href={href} className={cn(box, 'hover:border-accent-br')}>
      {inner}
    </Link>
  ) : (
    <div className={box}>{inner}</div>
  );
}

const names = (list: { name: string }[]) =>
  list.length ? list.map((d) => d.name).join(', ') : undefined;
const first = (list: { id: string }[]) =>
  list[0] ? `/admin/departments/${list[0].id}` : '/admin/departments';

function waited(minutes: number) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

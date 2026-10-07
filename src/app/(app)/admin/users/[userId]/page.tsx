import type { Metadata } from 'next';
import Link from 'next/link';
import type { AccountKindKey, MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
import { PersonActions } from './PersonActions';
import { KindEditor } from './KindEditor';

export const metadata: Metadata = { title: 'Person' };

type Person = {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  initials: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  joinedAt: string | null;
  invitedBy: string | null;
  lastLoginAt: string | null;
  kinds: AccountKindKey[];
  places: string[];
  otherRoles: string[];
  invitation: { expiresAt: string; expired: boolean; sentCount: number; accepted: boolean } | null;
  isYou: boolean;
  canImpersonate: boolean;
  recentActivity: { at: string; action: string; summary: string | null }[];
};

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

export default async function PersonPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'admin.users.read')) return <ForbiddenState what="the users of this church" />;

  const person = await serverApi<Person>(`/admin/users/${userId}`);

  return (
    <>
      <Link href="/admin/users" className="text-[12px] text-fg2 hover:text-fg">
        ← Users
      </Link>

      <div className="mt-3">
        <PageHeader
          title={person.fullName}
          subtitle={`${person.email} · ${person.status === 'ACTIVE' ? 'Active' : person.status === 'INVITED' ? 'Invited' : 'Disabled'}${person.joinedAt ? ` · joined ${date(person.joinedAt)}` : ''}`}
          actions={<PersonActions me={me} person={person} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-[10px] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-fg">What they are</h2>
            <div className="mt-3">
              <KindEditor
                userId={person.userId}
                kinds={person.kinds}
                places={person.places}
                otherRoles={person.otherRoles}
                canEdit={can(me, 'admin.users.manage')}
              />
            </div>
          </section>

          <section className="rounded-[10px] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-fg">Recent activity</h2>
            {person.recentActivity.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-fg3">Nothing yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {person.recentActivity.map((event, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 text-[12.5px]">
                    <span className="text-fg">{event.summary ?? event.action}</span>
                    <span className="text-fg3">
                      {new Date(event.at).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-3 rounded-[10px] border border-border bg-surface p-4 text-[12.5px]">
          <div>
            <p className="text-fg3">Phone</p>
            <p className="text-fg">{person.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-fg3">Last signed in</p>
            <p className="text-fg">{date(person.lastLoginAt)}</p>
          </div>
          {person.invitedBy && (
            <div>
              <p className="text-fg3">Invited by</p>
              <p className="text-fg">{person.invitedBy}</p>
            </div>
          )}
          {person.status === 'INVITED' && person.invitation && (
            <div className="flex flex-col gap-1">
              <Badge tone={person.invitation.expired ? 'danger' : 'accent'}>
                {person.invitation.expired ? 'Invitation expired' : 'Invitation waiting'}
              </Badge>
              <p className="text-fg3">
                Sent {person.invitation.sentCount} time
                {person.invitation.sentCount === 1 ? '' : 's'} · expires{' '}
                {date(person.invitation.expiresAt)}
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

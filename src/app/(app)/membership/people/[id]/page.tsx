import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PLEDGE_STATUS_LABEL, formatMoney, type MeResponse, type PledgeDetail } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
import { SpiritualPills } from '@/modules/membership/components/SpiritualPills';
import { NoteDrawer } from '@/modules/membership/components/NoteDrawer';
import { Facts } from '@/modules/membership/components/Facts';
import { EnrollDrawer } from '@/modules/membership/components/EnrollDrawer';
import { MessagingSettings } from '@/modules/membership/components/MessagingSettings';
import { STAGE_LABEL, day, when, type PersonDetail } from '@/modules/membership/types';
import { Journey } from './Journey';
import { StageActions } from './StageActions';

export const metadata: Metadata = { title: 'Person' };

type Tab = 'overview' | 'answers' | 'faith' | 'notes' | 'pledges';

/** A titled card, the page's one building block. */
function Card({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[12px] border border-border bg-surface p-4', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
        {aside && <span className="text-[11.5px] text-fg3">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/**
 * One person. The header says who they are and where they are on the road
 * to membership; the tabs below keep the rest a click away instead of all
 * on one page: what to do next, what they told us, their faith and family,
 * the notes the office keeps, and their pledges.
 */
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'membership.people.read')) return <ForbiddenState what="this person's record" />;

  const { id } = await params;
  const { tab: asked } = await searchParams;
  // Names against amounts are Finance's sensitive permission, whoever reads
  // this page (docs/modules/pledges-brief.md).
  const seesPledges = can(me, 'finance.pledges.read_sensitive');
  const [person, pledges] = await Promise.all([
    serverApi<PersonDetail>(`/membership/people/${id}`),
    seesPledges
      ? serverApi<PledgeDetail[]>(`/finance/pledges/people/${id}`)
      : Promise.resolve([] as PledgeDetail[]),
  ]);
  const currency = me.church?.currency ?? 'TZS';
  const s = person.sensitive;
  const notes = person.notes;

  const tabs: [Tab, string, number | null][] = [
    ['overview', 'Overview', null],
    ['answers', 'Their answers', null],
    ...(s ? ([['faith', 'Faith and family', null]] as [Tab, string, null][]) : []),
    ...(notes ? ([['notes', 'Notes', notes.length]] as [Tab, string, number][]) : []),
    ...(seesPledges && pledges.length
      ? ([['pledges', 'Pledges', pledges.length]] as [Tab, string, number][])
      : []),
  ];
  const tab: Tab = tabs.find(([key]) => key === asked)?.[0] ?? 'overview';
  const href = (key: Tab) =>
    `/membership/people/${person.id}${key === 'overview' ? '' : `?tab=${key}`}`;

  const yesNo = (v: boolean | null) => (v === null ? '' : v ? 'Yes' : 'No');
  const withYear = (v: boolean | null, year: string) =>
    yesNo(v) && `${yesNo(v)}${year ? `, ${year}` : ''}`;
  const about = [person.gender, person.ageGroup, person.livesIn].filter(Boolean);

  return (
    <div className="max-w-5xl">
      <Link href="/membership/people" className="text-[12px] text-fg3 hover:text-fg">
        ← Registrations
      </Link>

      <header className="mt-2 mb-4 rounded-[14px] border border-border bg-surface">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <span
            aria-hidden="true"
            className="flex size-14 flex-none items-center justify-center rounded-full bg-chip text-[18px] font-semibold text-fg2"
          >
            {person.initials}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-semibold text-fg">{person.fullName || 'Unknown'}</h1>
              <Badge tone={person.stage === 'CONFIRMED_MEMBER' ? 'accent' : 'muted'}>
                {STAGE_LABEL[person.stage]}
              </Badge>
              {person.memberNumber && (
                <span className="text-[12px] text-fg3 tabular-nums">
                  Member no. {person.memberNumber}
                </span>
              )}
              {!person.complete && person.hasRegistration && (
                <Badge tone="accent">Form not finished</Badge>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-fg2">
              {person.phone && (
                <a
                  href={`tel:${person.phone.replace(/\s/g, '')}`}
                  className="tabular-nums hover:underline"
                >
                  {person.phone}
                </a>
              )}
              {about.length > 0 && <span>{about.join(' · ')}</span>}
            </p>
            <p className="text-[11.5px] text-fg3">
              Registered {day(person.registeredAt)}
              {person.confirmedAt && ` · confirmed ${day(person.confirmedAt)}`}
            </p>
          </div>
          <NoteDrawer personId={person.id} name={person.fullName} size="md" />
        </div>
        <div className="border-t border-border2 px-5 pt-4 pb-3">
          <Journey stage={person.stage} history={person.history} />
        </div>
      </header>

      <nav
        aria-label="Their record"
        className="mb-4 flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map(([key, label, count]) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={tab === key ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] whitespace-nowrap',
              tab === key
                ? 'border-accent font-medium text-fg'
                : 'border-transparent text-fg2 hover:text-fg',
            )}
          >
            {label}
            {count !== null && (
              <span className="rounded-full bg-chip px-1.5 text-[10.5px] text-fg3 tabular-nums">
                {count}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card title="Next step">
              <div className="flex flex-col gap-3">
                <SpiritualPills
                  personId={person.id}
                  saved={person.saved}
                  baptised={person.baptised}
                  savedBy={person.savedBy}
                  baptisedBy={person.baptisedBy}
                />
                <StageActions personId={person.id} stage={person.stage} />
                {(person.stage === 'VISITOR' || person.stage === 'NEW_CONVERT') && (
                  <div>
                    <EnrollDrawer personId={person.id} name={person.fullName} />
                  </div>
                )}
              </div>
            </Card>
            {notes && (
              <Card
                title="Latest note"
                aside={
                  notes.length > 1 && (
                    <Link href={href('notes')} className="text-accent hover:underline">
                      All {notes.length} notes
                    </Link>
                  )
                }
              >
                {notes[0] ? (
                  <Note note={notes[0]} />
                ) : (
                  <p className="text-[12.5px] text-fg3">
                    Nothing written down yet. Add a note after a call or a visit.
                  </p>
                )}
              </Card>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <Card title="Contact">
              <Facts
                facts={[['Phone', person.phone], ...(s ? ([['Email', s.email]] as const) : [])]}
              />
              <div className="mt-3">
                <MessagingSettings
                  personId={person.id}
                  lang={person.messaging.lang}
                  optOut={person.messaging.optOut}
                  optOutSource={person.messaging.optOutSource}
                />
              </div>
            </Card>
            {s?.prayer !== undefined && (
              <Card title="Prayer request" aside="Pastors only">
                <p className="text-[12.5px] whitespace-pre-line text-fg2">
                  {s.prayer || 'None given.'}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'answers' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="About them"
            aside={person.hasRegistration ? 'From the registration form' : 'Entered by the office'}
          >
            <Facts
              facts={[
                ['Gender', person.gender],
                ['Age group', person.ageGroup],
                ...(s ? ([['Date of birth', s.dob]] as const) : []),
                ['Lives in', person.livesIn],
                [
                  'Occupation',
                  [person.occupation.kind, person.occupation.detail].filter(Boolean).join(' · '),
                ],
              ]}
            />
          </Card>
          <Card
            title="Their visit"
            aside={
              !person.complete &&
              person.progress &&
              `${person.progress.answered} of ${person.progress.of} answered`
            }
          >
            <Facts
              facts={[
                ['Came for', person.visit.join(', ')],
                ['Heard via', person.heardVia.join(', ')],
                ['Interested in', person.interestedIn.join(', ')],
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'faith' && s && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Faith">
            <Facts
              facts={[
                ['Saved', withYear(s.faith.saved, s.faith.savedYear)],
                ['Baptised', withYear(s.faith.baptised, s.faith.baptisedYear)],
                ['Holy Spirit', yesNo(s.faith.holySpirit)],
                ['Previous church', s.faith.previousChurch],
              ]}
            />
          </Card>
          <Card title="Family">
            <Facts
              facts={[
                [
                  'Marital status',
                  s.family.marital &&
                    `${s.family.marital}${s.family.marriedYear ? `, since ${s.family.marriedYear}` : ''}`,
                ],
                ['Children', s.family.children.join(', ')],
              ]}
            />
          </Card>
          <Card title="Serving" className="md:col-span-2">
            <Facts
              facts={[
                ['Would like to serve', s.ministries.join(', ')],
                ['What they liked', s.liked],
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'notes' && notes && (
        <Card title="Notes" aside="Seen by the office only">
          {notes.length === 0 ? (
            <p className="text-[12.5px] text-fg3">Nothing written down yet.</p>
          ) : (
            <ol className="flex flex-col">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="border-t border-border2 py-3 first:border-0 first:pt-0"
                >
                  <Note note={note} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {tab === 'pledges' && seesPledges && (
        <Card title="Pledges" aside="Only the finance manager and the pastors see this">
          <ul className="flex flex-col gap-3">
            {pledges.map((p) => {
              const share =
                Number(p.amount) > 0 ? Math.min(1, Number(p.paid) / Number(p.amount)) : 0;
              return (
                <li key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                    <Link
                      href={`/finance/pledges/${p.campaign.id}/${p.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {p.campaign.name}
                    </Link>
                    <span className="text-fg3">
                      {p.overdue
                        ? 'Overdue'
                        : p.status === 'OPEN'
                          ? `${formatMoney(p.balance, currency)} left`
                          : PLEDGE_STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <span className="h-1.5 overflow-hidden rounded-full bg-chip" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </span>
                  <span className="text-[11.5px] text-fg2 tabular-nums">
                    {formatMoney(p.paid, currency)} of {formatMoney(p.amount, currency)} paid
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Note({ note }: { note: NonNullable<PersonDetail['notes']>[number] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11.5px] text-fg3">
        {note.kind === 'VISIT' ? 'Visit' : note.kind === 'CALL' ? 'Call' : 'Note'} · {note.by} ·{' '}
        {when(note.at)}
      </p>
      <p className="text-[12.5px] whitespace-pre-line text-fg2">{note.body}</p>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { initialsOf } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { STAGE_LABEL, type Stage } from '@/modules/membership/types';
import { PrayerFilters } from './PrayerFilters';

export const metadata: Metadata = { title: 'Prayers' };

type PrayerCard = {
  personId: string;
  name: string;
  phone: string;
  stage: Stage;
  prayer: string;
  writtenAt: string;
};

const TZ = 'Africa/Dar_es_Salaam';
const monthOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: TZ });
const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  });

/**
 * The prayer requests people wrote when they registered, for the pastors
 * alone (D34), newest first and gathered by month. Each reads as a quote,
 * with who wrote it and how to call them. Nothing here can be changed,
 * printed or exported; a card opens the person in Membership.
 */
export default async function PrayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; month?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'membership.prayers.read')) return <ForbiddenState what="prayer requests" />;
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries({ q: params.q, month: params.month }).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && !!e[1],
    ),
  );
  const { cards, more } = await serverApi<{ cards: PrayerCard[]; more: boolean }>(
    `/membership/prayers${query.size ? `?${query}` : ''}`,
  );
  const shown = cards;

  const months: [string, typeof shown][] = [];
  for (const c of shown) {
    const m = monthOf(c.writtenAt);
    const last = months.at(-1);
    if (last?.[0] === m) last[1].push(c);
    else months.push([m, [c]]);
  }

  const filtered = query.size > 0;

  return (
    <>
      <PageHeader
        title="Prayers"
        subtitle="What people asked the pastors to pray for when they registered. Only the pastors see this page."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4">
        <PrayerFilters />
      </div>

      {shown.length === 0 ? (
        <EmptyState title={filtered ? 'No prayer request in this list' : 'No prayer requests yet'}>
          {filtered ? null : 'They appear here when someone writes one on the registration form.'}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {months.map(([month, list]) => (
            <section key={month} aria-label={month}>
              <h2 className="mb-3 flex items-baseline gap-2 text-[13px] font-semibold text-fg">
                {month}
                <span className="text-[12px] font-normal text-fg3">
                  {list.length} {list.length === 1 ? 'request' : 'requests'}
                </span>
              </h2>
              <ul className="columns-1 gap-3 md:columns-2 xl:columns-3">
                {list.map((c) => (
                  <li
                    key={c.personId}
                    className="group relative mb-3 flex break-inside-avoid flex-col gap-4 overflow-hidden rounded-[14px] border border-border bg-surface p-5 transition-colors hover:border-accent-br"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-3 right-3 font-serif text-[88px] leading-none text-accent opacity-15"
                    >
                      &ldquo;
                    </span>
                    <p className="relative font-serif text-[17px] leading-relaxed whitespace-pre-line text-fg">
                      {c.prayer}
                    </p>
                    <div className="flex items-center gap-2.5 border-t border-border2 pt-3">
                      <span
                        aria-hidden="true"
                        className="flex size-8 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
                      >
                        {initialsOf(c.name)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        {/* The whole card opens the person; the call button stays its own link. */}
                        <Link
                          href={`/membership/people/${c.personId}`}
                          className="truncate text-[12.5px] font-semibold text-fg after:absolute after:inset-0"
                        >
                          {c.name}
                        </Link>
                        <span className="text-[11px] text-fg3">
                          {STAGE_LABEL[c.stage]} · {dayOf(c.writtenAt)}
                        </span>
                      </span>
                      {c.phone && (
                        <a
                          href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                          title={`Call ${c.phone}`}
                          aria-label={`Call ${c.name}, ${c.phone}`}
                          className="relative z-10 flex size-8 flex-none items-center justify-center rounded-full border border-border text-fg2 hover:bg-hover hover:text-fg"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              d="M3.2 1.8h2.3l1.1 3-1.5 1a8 8 0 0 0 5.1 5.1l1-1.5 3 1.1v2.3a1.4 1.4 0 0 1-1.5 1.4A12.6 12.6 0 0 1 1.8 3.3a1.4 1.4 0 0 1 1.4-1.5Z"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11.5px] text-fg3">
        {more && 'Showing the newest 100. Choose a month or search a name to see others. '}
        Themes are guessed from the words of each request, in English, Swahili or French.
      </p>
    </>
  );
}

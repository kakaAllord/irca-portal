import type { Metadata } from 'next';
import Link from 'next/link';
import { initialsOf, type MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { STAGE_LABEL, type Stage } from '@/modules/membership/types';
import { PrayerFilters } from './PrayerFilters';
import { THEMES, themeLabel, themesOf, type Theme } from './themes';

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
 * with who wrote it and how to call them. The themes are guessed from the
 * words, to pray through one at a time. Nothing here can be changed,
 * printed or exported; a card opens the person in Membership.
 */
export default async function PrayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; month?: string; theme?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
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
  const theme = THEMES.find(([key]) => key === params.theme)?.[0];

  const withThemes = cards.map((c) => ({ ...c, themes: themesOf(c.prayer) }));
  const counts = new Map<Theme, number>();
  for (const c of withThemes) for (const t of c.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  const shown = theme ? withThemes.filter((c) => c.themes.includes(theme)) : withThemes;

  const months: [string, typeof shown][] = [];
  for (const c of shown) {
    const m = monthOf(c.writtenAt);
    const last = months.at(-1);
    if (last?.[0] === m) last[1].push(c);
    else months.push([m, [c]]);
  }

  const themeHref = (key?: Theme) => {
    const next = new URLSearchParams(query);
    if (key) next.set('theme', key);
    return `/membership/prayers${next.size ? `?${next}` : ''}`;
  };
  const filtered = query.size > 0 || !!theme;

  return (
    <>
      <PageHeader
        title="Prayers"
        subtitle="What people asked the pastors to pray for when they registered. Only the pastors see this page."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4">
        <PrayerFilters />
        {counts.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11.5px] text-fg3">Pray through</span>
            <Link href={themeHref()} className={chip(!theme)}>
              Everything <span className="tabular-nums text-fg3">{cards.length}</span>
            </Link>
            {THEMES.filter(([key]) => counts.has(key)).map(([key, label]) => (
              <Link key={key} href={themeHref(key)} className={chip(theme === key)}>
                {label} <span className="tabular-nums text-fg3">{counts.get(key)}</span>
              </Link>
            ))}
          </div>
        )}
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
                    {c.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.themes.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-chip px-2 py-0.5 text-[10.5px] text-fg2"
                          >
                            {themeLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
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

const chip = (on: boolean) =>
  cn(
    'rounded-full border px-2.5 py-1 text-[12px]',
    on ? 'border-accent-br bg-chip text-fg' : 'border-border text-fg2 hover:bg-hover',
  );

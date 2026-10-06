import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
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

const written = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Dar_es_Salaam',
  });

/**
 * The prayer requests people wrote when they registered, for the pastors
 * alone (D34): one large card each, newest first. Nothing here can be
 * changed, printed or exported. The card opens the person in Membership.
 */
export default async function PrayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; month?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'membership.prayers.read')) return <ForbiddenState what="prayer requests" />;
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string' && !!e[1]),
  );
  const { cards, more } = await serverApi<{ cards: PrayerCard[]; more: boolean }>(
    `/membership/prayers${query.size ? `?${query}` : ''}`,
  );
  const filtered = query.size > 0;

  return (
    <>
      <PageHeader
        title="Prayers"
        subtitle="What people asked the pastors to pray for when they registered. Only the pastors see this page."
      />
      <div className="mb-4">
        <PrayerFilters />
      </div>
      {cards.length === 0 ? (
        <EmptyState title={filtered ? 'No prayer request in this list' : 'No prayer requests yet'}>
          {filtered ? null : 'They appear here when someone writes one on the registration form.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {cards.map((c) => (
            <li
              key={c.personId}
              className="relative flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-5 hover:border-accent-br"
            >
              <p className="text-[17px] leading-relaxed whitespace-pre-line text-fg">{c.prayer}</p>
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
                {/* The whole card opens the person; the phone stays its own link above it. */}
                <Link
                  href={`/membership/people/${c.personId}`}
                  className="font-semibold text-fg after:absolute after:inset-0 after:rounded-[12px]"
                >
                  {c.name}
                </Link>
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                    className="relative z-10 text-accent underline tabular-nums"
                  >
                    {c.phone}
                  </a>
                )}
                <Badge tone="muted">{STAGE_LABEL[c.stage]}</Badge>
                <span className="text-fg3">{written(c.writtenAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <p className="mt-4 text-[12px] text-fg3">
          Showing the newest 100. Choose a month or search a name to see others.
        </p>
      )}
    </>
  );
}

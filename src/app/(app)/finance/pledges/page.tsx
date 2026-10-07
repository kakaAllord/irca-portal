import type { Metadata } from 'next';
import Link from 'next/link';
import { formatMoney, type MeResponse, type PledgeCampaignView } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { cn } from '@/lib/cn';
import { CampaignDrawer } from '@/modules/finance/pledges/CampaignDrawer';
import { PaymentDrawer } from '@/modules/finance/pledges/PaymentDrawer';

export const metadata: Metadata = { title: 'Pledges' };

/**
 * Every campaign, and how it is going: what was promised and what came in.
 * Totals only; who owes what is one level down, for those allowed to see it.
 */
export default async function PledgesPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.pledges.read')) return <ForbiddenState what="pledges" />;

  const campaigns = await serverApi<PledgeCampaignView[]>('/finance/pledge-campaigns');
  const currency = me.church?.currency ?? 'TZS';
  const timezone = me.church?.timezone ?? 'UTC';
  const open = campaigns.filter((c) => c.isActive);
  const closed = campaigns.filter((c) => !c.isActive);

  return (
    <>
      <PageHeader
        title="Pledges"
        subtitle="What people promised towards each campaign, and what has come in."
        actions={
          <>
            {can(me, 'finance.pledges.record_payment') && campaigns.length > 0 && (
              <PaymentDrawer
                currency={currency}
                timezone={timezone}
                variant={can(me, 'finance.pledges.manage') ? 'secondary' : 'primary'}
              />
            )}
            {can(me, 'finance.pledges.manage') && <CampaignDrawer timezone={timezone} />}
          </>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet">
          {can(me, 'finance.pledges.manage')
            ? 'Open one for whatever the church is raising for, then record the pledges made towards it.'
            : 'A campaign is opened first, and then pledges are recorded against it.'}
        </EmptyState>
      ) : (
        <>
          <section
            aria-label="Open campaigns together"
            className="mb-6 grid gap-px overflow-hidden rounded-[18px] border border-border bg-border sm:grid-cols-3"
          >
            <Figure
              label={`Raised, ${open.length} open ${open.length === 1 ? 'campaign' : 'campaigns'}`}
              value={formatMoney(String(sum(open, 'received')), currency)}
              strong
            />
            <Figure
              label="Still owed on open pledges"
              value={formatMoney(String(sum(open, 'outstanding')), currency)}
            />
            <Figure
              label="Pledges overdue"
              value={String(open.reduce((n, c) => n + c.counts.overdue, 0))}
              warn={open.some((c) => c.counts.overdue > 0)}
            />
          </section>

          <ul className="grid gap-4 lg:grid-cols-2">
            {[...open, ...closed].map((c) => {
              const goal = Number(c.targetAmount ?? c.promised);
              const share = goal > 0 ? Number(c.received) / goal : 0;
              return (
                <li key={c.id}>
                  <Link
                    href={`/finance/pledges/${c.id}`}
                    className={cn(
                      'flex h-full flex-col gap-4 rounded-[18px] border border-border bg-surface p-5 transition-colors hover:border-accent-br',
                      !c.isActive && 'opacity-75',
                    )}
                  >
                    <span className="flex items-start gap-4">
                      <Ring share={share} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-semibold text-fg">
                            {c.name}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                              c.isActive ? 'bg-pos-bg text-pos' : 'bg-chip text-fg3',
                            )}
                          >
                            {c.isActive ? 'Open' : 'Closed'}
                          </span>
                        </span>
                        <span className="text-[11.5px] text-fg3">{span(c.startsOn, c.endsOn)}</span>
                        <span className="mt-1 text-[22px] leading-tight font-semibold text-fg tabular-nums">
                          {formatMoney(c.received, currency)}
                        </span>
                        <span className="text-[12px] text-fg3 tabular-nums">
                          raised of {formatMoney(c.promised, currency)} promised
                          {c.targetAmount &&
                            ` · aiming for ${formatMoney(c.targetAmount, currency)}`}
                        </span>
                      </span>
                    </span>
                    <span className="grid grid-cols-3 gap-2 border-t border-border2 pt-3">
                      <Stat label="Still owed" value={formatMoney(c.outstanding, currency)} />
                      <Stat
                        label="Overdue"
                        value={`${c.counts.overdue} of ${c.counts.open + c.counts.completed}`}
                        warn={c.counts.overdue > 0}
                      />
                      <Stat label="Paid in full" value={String(c.counts.completed)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

const sum = (list: PledgeCampaignView[], key: 'received' | 'outstanding') =>
  list.reduce((n, c) => n + Number(c[key]), 0);

function Figure({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col bg-surface px-5 py-4">
      <span className="text-[11.5px] text-fg3">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          strong ? 'text-[24px] text-fg' : 'text-[19px]',
          warn ? 'text-warn-fg' : 'text-fg',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[11px] text-fg3">{label}</span>
      <span
        className={cn(
          'truncate text-[13px] font-semibold tabular-nums',
          warn ? 'text-warn-fg' : 'text-fg',
        )}
      >
        {value}
      </span>
    </span>
  );
}

/** The share raised, as a ring with the percentage inside; full past 100%. */
function Ring({ share }: { share: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative size-[76px] flex-none"
      role="img"
      aria-label={`${Math.round(share * 100)}% raised`}
    >
      <svg viewBox="0 0 76 76" className="size-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="8" className="stroke-chip" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${Math.min(1, share) * c} ${c}`}
          className="stroke-pos"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-fg tabular-nums">
        {Math.round(share * 100)}%
      </span>
    </span>
  );
}

const month = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
const span = (from: string, to: string | null) =>
  to ? `${month(from)} – ${month(to)}` : `From ${month(from)}`;

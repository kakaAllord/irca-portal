import type { Metadata } from 'next';
import Link from 'next/link';
import type { ChangeRequestView } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { CancelRequestButton } from '@/components/requests/CancelRequestButton';

export const metadata: Metadata = { title: 'Finance requests' };

/**
 * What Finance has asked an administrator to correct or void, and how it
 * went. The ones still waiting come first, in full: what would change, from
 * what to what, and why. The decided ones follow as a history, each opening
 * to the same detail.
 *
 * There are no approve buttons here, ever: deciding happens in Admin, by
 * someone other than the person who asked.
 */
export default async function FinanceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'finance.transactions.read')) return <ForbiddenState what="finance requests" />;

  const params = await searchParams;
  const mine = params.mine === 'true';
  const requests = await serverApi<ChangeRequestView[]>(
    `/finance/change-requests${mine ? '?mine=true' : ''}`,
  );
  const waiting = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle="Corrections and voids Finance asked for. An administrator decides each one, never the person who asked."
        actions={
          <div
            role="group"
            aria-label="Whose requests"
            className="inline-flex rounded-full border border-border bg-surface2 p-0.5"
          >
            {[
              [false, 'Everyone’s'],
              [true, 'Only mine'],
            ].map(([value, label]) => (
              <Link
                key={String(value)}
                href={value ? '/finance/requests?mine=true' : '/finance/requests'}
                aria-current={mine === value ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[12.5px]',
                  mine === value ? 'bg-surface font-medium text-fg shadow-sm' : 'text-fg2',
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        }
      />

      {requests.length === 0 ? (
        <EmptyState title="Nothing asked for yet">
          A correction or a void is asked for from the entry itself: open it, then Request a change.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="waiting-heading" className="mb-8">
            <h2
              id="waiting-heading"
              className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-fg"
            >
              Waiting for an administrator
              <span className="rounded-full bg-chip px-2 text-[11.5px] font-medium text-fg2 tabular-nums">
                {waiting.length}
              </span>
            </h2>
            {waiting.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-border p-5 text-center text-[12.5px] text-fg3">
                Nothing is waiting. Every request has been decided.
              </p>
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {waiting.map((r) => (
                  <li
                    key={r.id}
                    className="relative flex flex-col gap-3 overflow-hidden rounded-[16px] border border-border bg-surface p-5 pl-6"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-1.5 bg-warn-fg"
                    />
                    <Head request={r} />
                    <Detail request={r} />
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border2 pt-3 text-[11.5px] text-fg3">
                      <span>
                        Asked by {r.requestedBy.fullName}
                        {r.isMine && ' (you)'} · {ago(r.requestedAt)}
                      </span>
                      {r.isMine && <CancelRequestButton id={r.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {decided.length > 0 && (
            <section aria-labelledby="decided-heading">
              <h2 id="decided-heading" className="mb-3 text-[14px] font-semibold text-fg">
                Decided
              </h2>
              <ul className="divide-y divide-border2 overflow-hidden rounded-[16px] border border-border bg-surface">
                {decided.map((r) => (
                  <li key={r.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-hover">
                        <Verdict status={r.status} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium text-fg">
                            {what(r)}
                          </span>
                          <span className="truncate text-[11.5px] text-fg3">
                            {r.entityLabel} · asked by {r.requestedBy.fullName}
                            {r.decidedBy &&
                              `, ${STATUS[r.status].toLowerCase()} by ${r.decidedBy.fullName}`}
                          </span>
                        </span>
                        <span className="flex-none text-[11.5px] text-fg3">
                          {ago(r.decidedAt ?? r.requestedAt)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-fg3 transition-transform group-open:rotate-180"
                        >
                          ▾
                        </span>
                      </summary>
                      <div className="border-t border-border2 bg-surface2 px-4 py-3 pl-16">
                        <Detail request={r} />
                        {r.decisionNote && (
                          <p className="mt-2 text-[12px] text-fg2">
                            <span className="text-fg3">Their note: </span>
                            {r.decisionNote}
                          </p>
                        )}
                        {r.result?.newCode && (
                          <p className="mt-1 text-[12px] text-fg3">Now {r.result.newCode}.</p>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

const STATUS: Record<ChangeRequestView['status'], string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Withdrawn',
};

const what = (r: ChangeRequestView) =>
  r.action === 'VOID'
    ? 'Void the entry'
    : `Correct the ${r.changes.map((c) => c.label.toLowerCase()).join(', ') || 'entry'}`;

function Head({ request }: { request: ChangeRequestView }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-[15px] font-semibold text-fg">{what(request)}</p>
      {request.entityHref ? (
        <Link
          href={request.entityHref}
          className="rounded-full bg-chip px-2.5 py-0.5 font-mono text-[11.5px] text-fg2 hover:text-fg"
        >
          {request.entityLabel}
        </Link>
      ) : (
        <span className="rounded-full bg-chip px-2.5 py-0.5 font-mono text-[11.5px] text-fg2">
          {request.entityLabel}
        </span>
      )}
    </div>
  );
}

/** What would change, from what to what, and the reason given. */
function Detail({ request }: { request: ChangeRequestView }) {
  return (
    <div className="flex flex-col gap-2.5">
      {request.changes.length > 0 && (
        <dl className="flex flex-col gap-1.5">
          {request.changes.map((c) => (
            <div key={c.field} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
              <dt className="w-24 flex-none text-[12px] text-fg3">{c.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-2 tabular-nums">
                <span className="text-fg3 line-through">{c.from}</span>
                <span aria-label="becomes" className="text-fg3">
                  →
                </span>
                <span className="font-semibold text-fg">{c.to}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <blockquote className="border-l-2 border-border pl-3 text-[12.5px] text-fg2 italic">
        {request.reason}
      </blockquote>
      {request.warning && <p className="text-[12px] text-warn-fg">{request.warning}</p>}
    </div>
  );
}

function Verdict({ status }: { status: ChangeRequestView['status'] }) {
  const look =
    status === 'APPROVED'
      ? { cls: 'bg-pos-bg text-pos', path: 'M3.5 8.5l3 3 6-7' }
      : status === 'REJECTED'
        ? { cls: 'bg-danger-bg text-danger', path: 'M4.5 4.5l7 7M11.5 4.5l-7 7' }
        : { cls: 'bg-chip text-fg3', path: 'M6 4L3 7l3 3M3.5 7H10a3 3 0 0 1 0 6H8' };
  return (
    <span
      title={STATUS[status]}
      className={cn('flex size-9 flex-none items-center justify-center rounded-full', look.cls)}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d={look.path} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{STATUS[status]}</span>
    </span>
  );
}

/** "2 hours ago", "yesterday", "3 Sept": enough to know how long it has waited. */
function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

import type { Metadata } from 'next';
import Link from 'next/link';
import type { ChangeRequestView, MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { RequestCard } from '@/components/requests/RequestCard';
import { DecideButtons } from '@/components/requests/DecideButtons';
import { Decision } from '@/components/requests/Decision';
import { cn } from '@/lib/cn';

type WaitingTemplate = {
  id: string;
  name: string;
  version: number;
  department: { name: string } | null;
  bodies: Partial<Record<'en' | 'sw' | 'fr', string>>;
  fields: string[];
  submittedAt: string | null;
  decisionNote: string | null;
  writtenBy: string | null;
  passedBy: string | null;
  yours: boolean;
};

type WaitingMessage = {
  id: string;
  audienceName: string;
  bodies: Partial<Record<'en' | 'sw' | 'fr', string>>;
  recipientCount: number;
  cost: string;
  scheduledFor: string | null;
  createdAt: string;
  createdBy: string | null;
  yours: boolean;
  minutesWaiting: number;
};

const KINDS = [
  { key: 'changes', label: 'Changes' },
  { key: 'templates', label: 'Templates' },
  { key: 'messages', label: 'Emergency messages' },
] as const;

const LANG = { en: 'English', sw: 'Kiswahili', fr: 'Français' } as const;

export const metadata: Metadata = { title: 'Requests' };

const TABS = [
  { key: 'PENDING', label: 'Waiting' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' },
] as const;

/**
 * Everything any portal has asked an administrator to approve: changes to
 * protected records (D17), and since D37 a template's final approval and
 * words no template covers, each on its own tab.
 *
 * Nothing changes until someone here says yes, and nobody can say yes to
 * their own request, which is why a card of your own shows why instead of a
 * button that would fail.
 */
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; module?: string; tab?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'admin.requests.read')) return <ForbiddenState what="change requests" />;

  const params = await searchParams;
  const tab = KINDS.some((k) => k.key === params.tab) ? params.tab! : 'changes';
  const status = params.status ?? 'PENDING';
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (params.module) query.set('module', params.module);
  const [requests, templates, messages] = await Promise.all([
    serverApi<ChangeRequestView[]>(`/admin/requests?${query}`),
    serverApi<WaitingTemplate[]>('/admin/templates'),
    serverApi<WaitingMessage[]>('/admin/messages'),
  ]);
  const counts: Record<string, number> = {
    changes: requests.filter((r) => r.status === 'PENDING').length,
    templates: templates.length,
    messages: messages.length,
  };

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle="What is waiting for an administrator. Nothing changes, and nothing is sent, until one of you says yes."
      />

      <nav className="mb-4 flex gap-1 border-b border-border" aria-label="What is waiting">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={`/admin/requests?tab=${k.key}`}
            aria-current={tab === k.key ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium',
              tab === k.key ? 'border-fg text-fg' : 'border-transparent text-fg2 hover:text-fg',
            )}
          >
            {k.label}
            {counts[k.key] ? (
              <span className="ml-1.5 rounded-full bg-danger-bg px-1.5 text-[11px] text-danger">
                {counts[k.key]}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {tab === 'templates' && (
        <Templates templates={templates} decide={can(me, 'admin.templates.decide')} />
      )}
      {tab === 'messages' && (
        <Messages messages={messages} decide={can(me, 'admin.messages.decide')} />
      )}
      {tab === 'changes' && (
        <>
          <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Filter by decision">
            {TABS.map((s) => (
              <Link
                key={s.key}
                href={
                  s.key ? `/admin/requests?tab=changes&status=${s.key}` : '/admin/requests?status='
                }
                aria-current={status === s.key ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-3 py-1 text-[12px]',
                  status === s.key
                    ? 'border-accent-br bg-chip text-fg'
                    : 'border-border text-fg2 hover:bg-hover',
                )}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          {requests.length === 0 ? (
            <EmptyState title="Nothing is waiting">
              Corrections people ask for will appear here.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  actions={
                    request.status === 'PENDING' && can(me, 'admin.requests.decide') ? (
                      <DecideButtons request={request} />
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function Templates({ templates, decide }: { templates: WaitingTemplate[]; decide: boolean }) {
  if (!templates.length) {
    return (
      <EmptyState title="No template is waiting">
        Templates Communications has passed, or written itself, appear here for the final approval.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <article key={t.id} className="rounded-[10px] border border-border bg-surface p-4">
          <h2 className="text-[14px] font-semibold text-fg">
            {t.name}
            {t.version > 1 && <span className="font-normal text-fg2"> · version {t.version}</span>}
          </h2>
          <p className="text-[12px] text-fg2">
            For {t.department?.name ?? 'Communications'} · written by {t.writtenBy ?? 'someone'}
            {t.passedBy ? ` · passed by ${t.passedBy} in Communications` : ''}
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-[12.5px]">
            {(Object.keys(LANG) as (keyof typeof LANG)[])
              .filter((l) => t.bodies[l])
              .map((l) => (
                <div key={l}>
                  <dt className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">
                    {LANG[l]}
                  </dt>
                  <dd className="whitespace-pre-line text-fg">{t.bodies[l]}</dd>
                </div>
              ))}
          </dl>
          {t.fields.length > 0 && (
            <p className="mt-2 text-[11.5px] text-fg3">
              Blanks: {t.fields.map((f) => `{{${f}}}`).join(', ')}
            </p>
          )}
          {t.decisionNote && (
            <p className="mt-2 text-[12px] text-fg2">Communications said: {t.decisionNote}</p>
          )}
          {decide && (
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Decision
                base={`/admin/templates/${t.id}`}
                mine={t.yours}
                yes="Approve"
                no="Send back"
                question={`Approve "${t.name}"?`}
                sayingYes="From now on it can be sent without asking, every time."
              />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Messages({ messages, decide }: { messages: WaitingMessage[]; decide: boolean }) {
  if (!messages.length) {
    return (
      <EmptyState title="No emergency message is waiting">
        Words no template covers wait here for an administrator before they are sent.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => (
        <article
          key={m.id}
          className={cn(
            'rounded-[10px] border bg-surface p-4',
            m.minutesWaiting >= 15 ? 'border-danger-br' : 'border-border',
          )}
        >
          <h2 className="text-[14px] font-semibold text-fg">To {m.audienceName}</h2>
          <p className="text-[12px] text-fg2">
            {m.recipientCount} people · {m.cost} TZS · from {m.createdBy ?? 'Communications'} ·{' '}
            <span className={m.minutesWaiting >= 15 ? 'font-semibold text-danger' : ''}>
              waiting {m.minutesWaiting < 1 ? 'less than a minute' : `${m.minutesWaiting} min`}
            </span>
            {m.scheduledFor &&
              ` · set for ${new Date(m.scheduledFor).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`}
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-[12.5px]">
            {(Object.keys(LANG) as (keyof typeof LANG)[])
              .filter((l) => m.bodies[l])
              .map((l) => (
                <div key={l}>
                  <dt className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">
                    {LANG[l]}
                  </dt>
                  <dd className="whitespace-pre-line text-fg">{m.bodies[l]}</dd>
                </div>
              ))}
          </dl>
          {decide && (
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Decision
                base={`/admin/messages/${m.id}`}
                mine={m.yours}
                yes="Send it"
                no="Stop it"
                question={`Send this to ${m.recipientCount} people?`}
                sayingYes={
                  m.scheduledFor
                    ? 'It goes at the time it was set for.'
                    : 'It goes now, and cannot be called back.'
                }
              />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

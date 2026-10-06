import type { Metadata } from 'next';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { ViewAsButton } from '@/components/shell/ViewAsButton';
import { Badge } from '@/components/ui/Badge';
import type { AccessAccounts, AccessRoles } from '@/modules/dev/types';

export const metadata: Metadata = { title: 'Access' };

/**
 * Dev → Access (docs/plan/11, step 11.8; D43). Roles are the engine
 * underneath: the church does not divide its work by them, so nobody edits
 * them in the portal, and the developer reads them here. Who holds what comes
 * first, each account with an arrow to view the portal as them, since Admin →
 * People is the administrators' and not the developer's.
 */
export default async function AccessPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'dev.access.read')) return <ForbiddenState what="access" />;

  const [roles, accounts] = await Promise.all([
    serverApi<AccessRoles>('/dev/access'),
    serverApi<AccessAccounts>('/dev/access/accounts'),
  ]);
  const labels = new Map(
    roles.modules.flatMap((m) => m.permissions.map((p) => [p.key, p] as const)),
  );

  return (
    <>
      <PageHeader
        title="Access"
        subtitle="Who holds what, and what every role allows. Read-only: roles are not edited in the portal."
      />

      <section className="mb-8">
        <h2 className="mb-2 text-[13px] font-semibold text-fg">
          Accounts{' '}
          <span className="font-normal text-fg2">
            {accounts.accounts.length}
            {accounts.disabled ? `, and ${accounts.disabled} disabled` : ''}
          </span>
        </h2>
        <ul className="flex flex-col divide-y divide-border2 overflow-hidden rounded-[10px] border border-border bg-surface">
          {accounts.accounts.map((a) => (
            <li key={a.userId} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5">
              <div className="min-w-[200px] flex-1">
                <p className="text-[12.5px] font-medium text-fg">
                  {a.name} {a.status === 'INVITED' && <Badge tone="muted">Invited</Badge>}
                </p>
                <p className="text-[11.5px] text-fg2">{a.email}</p>
              </div>
              <div className="min-w-[200px] flex-[2] text-[12px] text-fg2">
                {a.roles.length === 0 && a.places.length === 0 ? (
                  <span className="text-fg3">Nothing yet</span>
                ) : (
                  <span>
                    {[
                      ...a.roles.map((r) => (r.key ? r.name : `${r.name} (custom)`)),
                      ...a.places,
                    ].join(' · ')}
                  </span>
                )}
              </div>
              {a.canViewAs && <ViewAsButton userId={a.userId} name={a.name} />}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-fg">Roles, portal by portal</h2>
        <div className="flex flex-col gap-4">
          {roles.modules.map((module) => (
            <article
              key={module.key}
              className="rounded-[10px] border border-border bg-surface p-4 text-[12.5px]"
            >
              <header className="mb-3 flex flex-wrap items-baseline gap-2">
                <h3 className="text-[14px] font-semibold text-fg">{module.name}</h3>
                <Badge tone={module.enabled ? 'positive' : 'muted'}>
                  {module.enabled ? 'On' : 'Off'}
                </Badge>
                <span className="text-fg2">
                  {module.kind === 'core'
                    ? 'The system’s own'
                    : module.department
                      ? `Belongs to ${module.department}`
                      : 'No department has it'}
                </span>
              </header>

              {module.roles.map((role) => (
                <div key={role.key} className="mb-3">
                  <p className="text-fg">
                    <span className="font-medium">{role.name}</span>{' '}
                    <code className="text-[11px] text-fg3">{role.key}</code>{' '}
                    <span className="text-fg2">
                      · {role.holders} {role.holders === 1 ? 'holds' : 'hold'} it
                    </span>
                  </p>
                  <p className="text-fg2">{role.description}</p>
                  <Permissions keys={role.permissions} labels={labels} />
                </div>
              ))}

              {module.leaders && (
                <div className="mb-3">
                  <p className="font-medium text-fg">Its department&apos;s leaders</p>
                  <p className="text-fg2">{module.leaders.description}</p>
                  <Permissions keys={module.leaders.permissions} labels={labels} />
                </div>
              )}

              {module.permissions.some((p) => p.fromLeadership) && (
                <div>
                  <p className="font-medium text-fg">Leading any department</p>
                  <Permissions
                    keys={module.permissions.filter((p) => p.fromLeadership).map((p) => p.key)}
                    labels={labels}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {roles.custom.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-[13px] font-semibold text-fg">
            Made in the old role editor, no longer made
          </h2>
          <p className="mb-2 text-[12px] text-fg2">
            Still held by the people who had them, and giving what they list; nobody new can be
            given one.
          </p>
          <ul className="flex flex-col gap-2">
            {roles.custom.map((role) => (
              <li
                key={role.id}
                className="rounded-[10px] border border-border bg-surface p-3 text-[12.5px]"
              >
                <p className="text-fg">
                  <span className="font-medium">{role.name}</span>{' '}
                  <span className="text-fg2">
                    · {role.module} · {role.holders} {role.holders === 1 ? 'holds' : 'hold'} it
                  </span>
                </p>
                <Permissions keys={role.permissions} labels={labels} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Permissions({
  keys,
  labels,
}: {
  keys: string[];
  labels: Map<string, { label: string; kind: 'read' | 'write' }>;
}) {
  if (!keys.length) return <p className="text-fg3">Nothing</p>;
  return (
    <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
      {keys.map((key) => (
        <li key={key} className="flex gap-1.5 text-[12px] text-fg2">
          <span className={labels.get(key)?.kind === 'write' ? 'text-warn-fg' : 'text-fg3'}>
            {labels.get(key)?.kind === 'write' ? 'changes' : 'reads'}
          </span>
          <span>{labels.get(key)?.label ?? key}</span>
        </li>
      ))}
    </ul>
  );
}

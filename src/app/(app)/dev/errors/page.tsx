import type { Metadata } from 'next';
import Link from 'next/link';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ErrorList, ErrorLookup, ErrorView } from '@/modules/dev/types';

export const metadata: Metadata = { title: 'Errors' };

const SOURCES = [
  { value: '', label: 'Everywhere' },
  { value: 'API', label: 'The API' },
  { value: 'PORTAL_SERVER', label: 'Building a page' },
  { value: 'PORTAL_BROWSER', label: 'In the browser' },
];

const SOURCE_LABEL: Record<ErrorView['source'], string> = {
  API: 'The API',
  PORTAL_SERVER: 'Building a page',
  PORTAL_BROWSER: 'In the browser',
};

/**
 * Dev → Errors (docs/plan/11, step 11.5): the owner asked for "a place in the
 * dev portal where one can just go paste that error and get whatever data
 * they need". The reference, or the whole sentence someone sent, goes in the
 * box; the answer is below it; the latest errors are listed underneath, each
 * one opening the same answer.
 *
 * All of it is a plain form and links, so the answer has an address that can
 * be pasted into a message too.
 */
export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'dev.logs.read')) return <ForbiddenState what="the errors" />;
  const timezone = me.church?.timezone ?? 'UTC';

  const params = await searchParams;
  const ref = params.ref?.trim() ?? '';
  const lookup = ref
    ? await serverApi<ErrorLookup>(`/dev/errors/lookup?${new URLSearchParams({ q: ref })}`)
    : null;

  const listQuery = new URLSearchParams({ limit: '50' });
  if (params.source) listQuery.set('source', params.source);
  if (params.day) listQuery.set('day', params.day);
  if (params.before) listQuery.set('before', params.before);
  const list = await serverApi<ErrorList>(`/dev/errors?${listQuery}`);

  return (
    <>
      <PageHeader
        title="Errors"
        subtitle="Paste the reference someone was shown, or the whole message they sent you, and see what happened."
      />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-[260px] flex-1">
          <Input
            label="Reference"
            name="ref"
            defaultValue={ref}
            placeholder="2276771245, or: …tell your developer this reference: 2276771245"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!ref}
          />
        </div>
        <Button type="submit">Look up</Button>
      </form>

      {lookup && <Answer lookup={lookup} timezone={timezone} />}

      <section className="mt-8">
        <h2 className="mb-2 text-[13px] font-semibold text-fg">Latest errors</h2>
        <form method="get" className="mb-3 flex flex-wrap items-end gap-2">
          <Select
            label="Where"
            name="source"
            defaultValue={params.source ?? ''}
            options={SOURCES}
          />
          <Input label="Day" name="day" type="date" defaultValue={params.day ?? ''} />
          <Button type="submit" variant="secondary">
            Show
          </Button>
        </form>
        {list.rows.length === 0 ? (
          <EmptyState title="No errors">
            {params.source || params.day
              ? 'None with those filters.'
              : 'Nothing has gone wrong in the last 90 days, or nothing anyone was shown.'}
          </EmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border2 overflow-hidden rounded-[10px] border border-border bg-surface">
            {list.rows.map((row) => (
              <li key={row.reference}>
                <Link
                  href={`/dev/errors?ref=${encodeURIComponent(row.reference)}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-hover"
                >
                  <span className="w-[120px] shrink-0 text-[11.5px] text-fg3">
                    {when(row.lastAt, timezone)}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-fg2">
                    {row.reference.length > 14 ? `${row.reference.slice(0, 8)}…` : row.reference}
                  </span>
                  <span className="order-last w-full min-w-0 truncate text-[12.5px] text-fg sm:order-none sm:w-auto sm:flex-1">
                    {row.path ?? ''} <span className="text-fg2">{row.message}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-fg2">
                    {row.who ?? 'Nobody signed in'}
                    {row.viewing ? ' (viewed as)' : ''}
                  </span>
                  <span className="shrink-0">
                    <Badge tone="neutral">{SOURCE_LABEL[row.source]}</Badge>
                  </span>
                  {row.count > 1 && (
                    <span className="shrink-0 text-[11.5px] font-semibold text-danger">
                      ×{row.count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list.nextBefore && (
          <Link
            className="mt-3 inline-block text-[12.5px] text-accent hover:underline"
            href={`/dev/errors?${new URLSearchParams({
              ...(params.source ? { source: params.source } : {}),
              ...(params.day ? { day: params.day } : {}),
              before: list.nextBefore,
            })}`}
          >
            Older
          </Link>
        )}
      </section>
    </>
  );
}

function Answer({ lookup, timezone }: { lookup: ErrorLookup; timezone: string }) {
  if (!lookup.found) {
    return (
      <section className="rounded-[10px] border border-border bg-surface p-4">
        <Alert tone="info">{lookup.message}</Alert>
        {lookup.request && <RequestLog request={lookup.request} timezone={timezone} />}
        {lookup.actions.length > 0 && <Actions actions={lookup.actions} timezone={timezone} />}
      </section>
    );
  }

  const { error, underneath } = lookup;
  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-danger-br bg-surface p-4">
      {lookup.hint && (
        <div className="rounded-[8px] border border-warn-br bg-warn-bg px-3 py-2.5 text-[12.5px] text-warn-fg">
          <span className="font-semibold">Likely cause: </span>
          {lookup.hint}
        </div>
      )}
      <ErrorBlock title="What they saw" error={error} timezone={timezone} />
      {underneath && (
        <ErrorBlock
          title="The API request that failed underneath"
          error={underneath}
          timezone={timezone}
        />
      )}
      {lookup.request && <RequestLog request={lookup.request} timezone={timezone} />}
      {lookup.actions.length > 0 && <Actions actions={lookup.actions} timezone={timezone} />}
    </section>
  );
}

function ErrorBlock({
  title,
  error,
  timezone,
}: {
  title: string;
  error: ErrorView;
  timezone: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-semibold text-fg">{title}</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[12.5px]">
        <dt className="text-fg3">Reference</dt>
        <dd className="font-mono break-all text-fg">{error.reference}</dd>
        <dt className="text-fg3">When</dt>
        <dd className="text-fg">
          {when(error.at, timezone)}
          {error.count > 1 &&
            `, and ${error.count - 1} more time${error.count === 2 ? '' : 's'}, last ${when(error.lastAt, timezone)}`}
        </dd>
        <dt className="text-fg3">Who</dt>
        <dd className="text-fg">
          {error.who ? `${error.who.name} <${error.who.email}>` : 'Nobody signed in'}
          {error.viewer && (
            <span className="text-fg2">
              {' '}
              — viewed as them by {error.viewer.name} &lt;{error.viewer.email}&gt;
            </span>
          )}
        </dd>
        <dt className="text-fg3">Where</dt>
        <dd className="text-fg">
          {SOURCE_LABEL[error.source]}
          {error.method ? ` · ${error.method}` : ''} {error.path && <code>{error.path}</code>}
          {error.routePath && error.routePath !== error.path && (
            <span className="text-fg2"> (route {error.routePath})</span>
          )}
        </dd>
        {(error.status || error.code) && (
          <>
            <dt className="text-fg3">Answer</dt>
            <dd className="text-fg">
              {error.status ?? ''} {error.code ?? ''}
            </dd>
          </>
        )}
        <dt className="text-fg3">Error</dt>
        <dd className="break-words text-fg">{error.message || '(no message)'}</dd>
        {error.requestId && error.requestId !== error.reference && (
          <>
            <dt className="text-fg3">API request</dt>
            <dd className="font-mono break-all text-fg">
              <Link
                className="text-accent hover:underline"
                href={`/dev/errors?ref=${error.requestId}`}
              >
                {error.requestId}
              </Link>
            </dd>
          </>
        )}
      </dl>
      {error.stack && (
        <pre className="mt-2 max-h-[280px] overflow-auto rounded-[8px] border border-border2 bg-bg px-3 py-2 font-mono text-[11px] leading-[1.5] text-fg2">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

function RequestLog({
  request,
  timezone,
}: {
  request: NonNullable<ErrorLookup['request']>;
  timezone: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-semibold text-fg">
        What the server wrote for request{' '}
        <span className="font-mono">{request.id.slice(0, 8)}</span>
        {request.status !== null && (
          <span className="font-normal text-fg2">
            {' '}
            · {request.method} {request.url} answered {request.status}
            {request.ms !== null ? ` in ${request.ms} ms` : ''}
          </span>
        )}
      </h2>
      {request.lines.length === 0 ? (
        <p className="text-[12px] text-fg3">
          The server no longer holds its lines: it keeps only the latest few thousand, and starts
          empty after a restart. The server&apos;s own log for the API has them, by this id.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-[8px] border border-border2 bg-bg font-mono text-[11px]">
          {request.lines.map((line) => (
            <li key={line.n} className="flex gap-2 px-3 py-1">
              <span className="shrink-0 text-fg3">{time(line.at, timezone)}</span>
              <span
                className={`w-[42px] shrink-0 uppercase ${line.level === 'error' || line.level === 'fatal' ? 'text-danger' : line.level === 'warn' ? 'text-warn-fg' : 'text-fg3'}`}
              >
                {line.level}
              </span>
              <span className="min-w-0 break-words text-fg2">
                {line.url ? `${line.method} ${line.url} ${line.status ?? ''}` : line.msg}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Actions({ actions, timezone }: { actions: ErrorLookup['actions']; timezone: string }) {
  return (
    <div>
      <h2 className="mb-2 text-[13px] font-semibold text-fg">What was done in that request</h2>
      <ul className="text-[12.5px]">
        {actions.map((a, i) => (
          <li key={i} className="flex flex-wrap gap-x-2">
            <span className="text-fg3">{time(a.at, timezone)}</span>
            <span className="text-fg">{a.summary ?? a.action}</span>
            <span className="text-fg2">{a.actor ?? 'The system'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const time = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour12: false, timeZone });

const when = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  });

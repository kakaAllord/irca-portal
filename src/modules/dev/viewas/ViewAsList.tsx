'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi } from '@/lib/api/client';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ended, howLong, type ViewAsDetail, type ViewAsSession } from './format';

type Filters = { actor: string; subject: string; from: string; to: string };

/**
 * Dev → View-as log as a list (docs/plan/11, step 11.6): who viewed as whom,
 * filtered by who, whom and when; each row one session, opening to every page
 * seen in it, in order. The owner asked for the two dev pages the other way
 * round: this list here, the terminal on Logs.
 */
export function ViewAsList({ timezone }: { timezone: string }) {
  const [filters, setFilters] = useState<Filters>({ actor: '', subject: '', from: '', to: '' });
  const [rows, setRows] = useState<ViewAsSession[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    async (before?: string) => {
      setBusy(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filters.actor.trim()) params.set('actor', filters.actor.trim());
        if (filters.subject.trim()) params.set('subject', filters.subject.trim());
        params.set('since', filters.from || '90d');
        // The whole of the last day asked for.
        if (filters.to) params.set('until', `${filters.to}T23:59:59`);
        if (before) params.set('before', before);
        const page = await clientApi<{ rows: ViewAsSession[]; next: string | null }>(
          `/dev/impersonations?${params}`,
        );
        setRows((old) => (before && old ? [...old, ...page.rows] : page.rows));
        setNext(page.next);
        setError(null);
      } catch {
        setError('Could not read the view-as log just now.');
      } finally {
        setBusy(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
        <Input
          label="Who viewed"
          placeholder="a name or email"
          value={filters.actor}
          onChange={set('actor')}
        />
        <Input
          label="As whom"
          placeholder="a name or email"
          value={filters.subject}
          onChange={set('subject')}
        />
        <Input label="From" type="date" value={filters.from} onChange={set('from')} />
        <Input label="To" type="date" value={filters.to} onChange={set('to')} />
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
        <a
          href={`/api/dev/impersonations.pdf?${new URLSearchParams({
            ...(filters.actor.trim() ? { actor: filters.actor.trim() } : {}),
            ...(filters.subject.trim() ? { subject: filters.subject.trim() } : {}),
            since: filters.from || '90d',
            ...(filters.to ? { until: `${filters.to}T23:59:59` } : {}),
          })}`}
          className="inline-flex h-9 items-center justify-center rounded-[7px] border border-border px-3.5 text-[12.5px] font-medium text-fg hover:bg-hover"
        >
          Download PDF
        </a>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="rounded-[10px] border border-border bg-surface px-4 py-6 text-center text-[12.5px] text-fg2">
          Nobody viewed as anybody
          {filters.actor || filters.subject || filters.from || filters.to
            ? ', with those filters.'
            : ' in the last 90 days.'}
        </p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border2 overflow-hidden rounded-[10px] border border-border bg-surface">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpen(row.id)}
                  className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-left hover:bg-hover"
                >
                  <span className="w-[120px] shrink-0 text-[11.5px] text-fg3">
                    {when(row.startedAt, timezone)}
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] text-fg">
                    {row.actor.name}
                    <span className="text-fg3"> viewed as </span>
                    {row.subject.name}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-fg2">
                    {howLong(row.seconds)} · {row.views} page{row.views === 1 ? '' : 's'}
                  </span>
                  <span className="shrink-0">
                    <Badge tone={row.endedAt ? 'neutral' : 'accent'}>{ended(row)}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {next && (
            <Button variant="secondary" loading={busy} onClick={() => void load(next)}>
              Show older
            </Button>
          )}
        </>
      )}

      <SessionDrawer id={open} timezone={timezone} onClose={() => setOpen(null)} />
    </div>
  );
}

function SessionDrawer({
  id,
  timezone,
  onClose,
}: {
  id: string | null;
  timezone: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ViewAsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    setError(null);
    clientApi<ViewAsDetail>(`/dev/impersonations/${id}`)
      .then(setDetail)
      .catch(() => setError('Could not read this session just now.'));
  }, [id]);

  return (
    <Drawer
      open={id !== null}
      onClose={onClose}
      title={detail ? `${detail.actor.name} viewed as ${detail.subject.name}` : 'A view-as session'}
      description={
        detail &&
        `${when(detail.startedAt, timezone)} · ${howLong(detail.seconds)} · ${ended(detail)}`
      }
    >
      {error && <Alert tone="error">{error}</Alert>}
      {!detail && !error && <Spinner />}
      {detail && (
        <div className="flex flex-col gap-4 text-[12.5px]">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            <dt className="text-fg3">Who viewed</dt>
            <dd className="text-fg">
              {detail.actor.name} &lt;{detail.actor.email}&gt;
            </dd>
            <dt className="text-fg3">As whom</dt>
            <dd className="text-fg">
              {detail.subject.name} &lt;{detail.subject.email}&gt;
            </dd>
            <dt className="text-fg3">Their roles</dt>
            <dd className="text-fg">{detail.subject.roles.join(', ') || 'None'}</dd>
            <dt className="text-fg3">Session</dt>
            <dd className="font-mono text-fg2">{detail.id}</dd>
          </dl>
          <div>
            <h3 className="mb-1.5 text-[12.5px] font-semibold text-fg">
              {detail.views.length} page{detail.views.length === 1 ? '' : 's'} seen, in order
            </h3>
            {detail.views.length === 0 ? (
              <p className="text-fg3">No pages were opened in it.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border2 rounded-[8px] border border-border2 font-mono text-[11px]">
                {detail.views.map((view, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 px-2.5 py-1.5">
                    <span className="text-fg3">{time(view.at, timezone)}</span>
                    <span className="text-fg2">{view.method}</span>
                    <span className="min-w-0 flex-1 break-all text-fg">{view.path}</span>
                    <span className={view.status >= 400 ? 'text-danger' : 'text-fg3'}>
                      {view.status}
                    </span>
                    <span className="text-fg3">{view.ms} ms</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </Drawer>
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

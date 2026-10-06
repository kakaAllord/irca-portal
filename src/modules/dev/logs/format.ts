import type { Line } from '../terminal/Terminal';

/** One line the server wrote, as the API returns it. */
export type ServerLine = {
  n: number;
  at: string;
  level: string;
  msg: string;
  reqId?: string;
  userId?: string;
  actorUserId?: string;
  method?: string;
  url?: string;
  status?: number;
  ms?: number;
  rest?: Record<string, unknown>;
};

export type ServerLogs = { lines: ServerLine[]; newest: number; dropped: boolean; held: number };

export type ActionRow = {
  id: string;
  at: string;
  source: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  actor: string | null;
  subject: string | null;
  requestId: string | null;
};

/** In the church's own time, because that is when it happened for them. */
export function clock(iso: string, timezone: string, withDay = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    ...(withDay ? { day: '2-digit', month: 'short' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

const pad = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);

const TONE: Record<string, Line['tone']> = {
  fatal: 'danger',
  error: 'danger',
  warn: 'warn',
  debug: 'dim',
  trace: 'dim',
};

/**
 * One server line in columns: time, level, then the request (method, path,
 * status, how long) or the message, and the start of the request id, which
 * `req` takes.
 */
export function serverLine(line: ServerLine, timezone: string): Line {
  const what = line.url
    ? [
        line.method ?? '',
        line.url,
        line.status !== undefined ? String(line.status) : '',
        line.ms !== undefined ? `${line.ms}ms` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : line.msg;
  const detail =
    line.url && line.msg && !/request (completed|errored)/.test(line.msg) ? ` — ${line.msg}` : '';
  return {
    text: `${clock(line.at, timezone)} ${pad(line.level.toUpperCase(), 5)} ${what}${detail}${line.reqId ? `  [${line.reqId.slice(0, 8)}]` : ''}`,
    tone:
      TONE[line.level] ??
      (line.status !== undefined && line.status >= 500
        ? 'danger'
        : line.status !== undefined && line.status >= 400
          ? 'warn'
          : undefined),
  };
}

/** One thing somebody did, from the activity log. */
export function actionLine(row: ActionRow, timezone: string): Line {
  return {
    text: `${clock(row.at, timezone, true)}  ${pad(row.actor ?? 'The system', 22)}  ${row.summary ?? row.action}${row.requestId ? `  [${row.requestId.slice(0, 8)}]` : ''}`,
  };
}

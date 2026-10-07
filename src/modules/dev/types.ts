/** What the dev console reads from the API. */

export type Series = { metric: string; points: { day: string; value: number }[] };

export type DatabaseUse = {
  totalBytes: number;
  tables: {
    table: string;
    rows: number;
    bytes: number;
    rowsWeekAgo: number;
    rowsMonthAgo: number;
    share: number;
  }[];
};

export type ChurchSettings = {
  code: string;
  name: string;
  timezone: string;
  currency: string;
  createdAt: string;
  codeLocked: boolean;
};

/** Dev → Settings → Alerts (docs/plan/10, step 10.4). */
export type AlertRecipient = { name: string; email: string; phone: string | null };
export type AlertsSettings = {
  recipients: AlertRecipient[];
  /** Hear only about credit and failing texts, as Communications. */
  commsOnly: AlertRecipient[];
  active: { key: string; summary: string; raisedAt: string; lastSentAt: string }[];
  dbStorageGb: number | null;
};

/** Dev → Errors (docs/plan/11, step 11.5). */
export type ErrorView = {
  reference: string;
  source: 'API' | 'PORTAL_SERVER' | 'PORTAL_BROWSER';
  at: string;
  lastAt: string;
  count: number;
  path: string | null;
  routePath: string | null;
  method: string | null;
  status: number | null;
  code: string | null;
  message: string;
  stack: string | null;
  requestId: string | null;
  extra: unknown;
  who: { name: string; email: string } | null;
  /** Who was really at the keyboard, while viewing as them. */
  viewer: { name: string; email: string } | null;
};

export type LogLineView = {
  n: number;
  at: string;
  level: string;
  msg: string;
  method?: string;
  url?: string;
  status?: number;
  ms?: number;
};

type RequestStory = {
  id: string;
  method: string | null;
  url: string | null;
  status: number | null;
  ms: number | null;
  lines: LogLineView[];
  held: boolean;
};

type ActionLine = { at: string; action: string; summary: string | null; actor: string | null };

export type ErrorLookup =
  | {
      found: true;
      reference: string;
      matchedBy: 'reference' | 'request';
      error: ErrorView;
      underneath: ErrorView | null;
      request: RequestStory | null;
      actions: ActionLine[];
      hint: string | null;
    }
  | {
      found: false;
      reference: string | null;
      request: RequestStory | null;
      actions: ActionLine[];
      message: string;
    };

export type ErrorList = {
  rows: {
    reference: string;
    source: ErrorView['source'];
    at: string;
    lastAt: string;
    count: number;
    path: string | null;
    status: number | null;
    message: string;
    who: string | null;
    viewing: boolean;
  }[];
  nextBefore: string | null;
};

export type RouteUse = { route: string; calls: number; averageMs: number | null };

export type SentEmail = {
  id: string;
  to: string;
  template: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

/** Whether the database has every migration the API was built with (docs/plan/11, 11.1). */
export type MigrationState = {
  behind: string[];
  ahead: string[];
  atLeast: boolean;
  unknown: string | null;
  checkedAt: string;
  fix: string;
};

export type Health = {
  migrations: MigrationState;
  database: { bytes: number; connections: number; tables: { table: string; bytes: number }[] };
  slowQueries: { query: string; calls: number; meanMs: number; totalMs: number }[] | null;
  outbox: Record<string, number>;
  /** Text messages waiting or given up on, and the last reading of the Beem credit, in TZS. */
  sms: { queue: Record<string, number>; credit: { amount: number; day: string } | null };
  jobs: {
    job: string;
    lastRunAt: string;
    durationMs: number | null;
    ok: boolean | null;
    error: string | null;
  }[];
  errors: { day: string; requests: number; errors: number }[];
};

/** 41 MB, 1.2 GB — sizes people read rather than count. */
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export const number = (n: number) => n.toLocaleString('en-GB');

/** "2 min ago", "3 days ago", "never". */
export function ago(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** The date `n` days before today, as the usage routes take it: 2026-09-24. */
export const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** A counter added up over the days asked for. */
export const total = (series: Series[], metric: string) =>
  series.find((s) => s.metric === metric)?.points.reduce((sum, p) => sum + p.value, 0) ?? 0;

/** A gauge as it was last measured. */
export const latest = (series: Series[], metric: string) =>
  series.find((s) => s.metric === metric)?.points.at(-1)?.value ?? 0;

/** Dev → Access (docs/plan/11, step 11.8; D43). */
export type AccessRoles = {
  modules: {
    key: string;
    name: string;
    kind: 'core' | 'department';
    enabled: boolean;
    department: string | null;
    permissions: {
      key: string;
      kind: 'read' | 'write';
      label: string;
      hint: string | null;
      fromLeadership: boolean;
    }[];
    roles: {
      key: string;
      name: string;
      description: string;
      permissions: string[];
      holders: number;
    }[];
    leaders: { description: string; permissions: string[] } | null;
  }[];
  leadership: string[];
  custom: { id: string; name: string; module: string; permissions: string[]; holders: number }[];
};

export type AccessAccounts = {
  disabled: number;
  accounts: {
    userId: string;
    email: string;
    name: string;
    status: 'ACTIVE' | 'INVITED' | 'DISABLED';
    roles: { key: string | null; name: string; module: string }[];
    places: string[];
    canViewAs: boolean;
  }[];
};

/** Dev → Settings: email, texts and the log level (D52). Never a password or a key. */
export type MessagingSettings = {
  email: {
    saved: boolean;
    host: string | null;
    port: number | null;
    user: string | null;
    from: string | null;
    canSave: boolean;
    sending: 'smtp' | 'log' | 'memory';
  };
  beem: {
    saved: boolean;
    senderId: string | null;
    keyHint: string | null;
    updatedAt: string | null;
    canSave: boolean;
    live: boolean;
    /** The password in the reply link; the page builds the link around it. */
    replyKey: string;
  };
  log: { level: 'error' | 'warn' | 'info' | 'debug'; saved: string | null };
};

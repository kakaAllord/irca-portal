/** A view-as session, as the API describes it. */
export type ViewAsSession = {
  id: string;
  actor: { name: string; email: string; roles: string[] };
  subject: { name: string; email: string; roles: string[] };
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  seconds: number | null;
  views: number;
};

export type PageSeen = { at: string; method: string; path: string; status: number; ms: number };

/** One session with every page opened in it. */
export type ViewAsDetail = Omit<ViewAsSession, 'views'> & { views: PageSeen[] };

/** 47s, 12m, 1h04. */
export function howLong(seconds: number | null): string {
  if (seconds === null) return 'still open';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h${String(Math.round((seconds % 3600) / 60)).padStart(2, '0')}`;
}

/** Why a session ended, in words. */
export function ended(session: Pick<ViewAsSession, 'endedAt' | 'endReason'>): string {
  if (!session.endedAt) return 'Still open';
  switch (session.endReason) {
    case 'STOPPED':
      return 'Came back';
    case 'EXPIRED':
      return 'Ran out of time';
    case 'LOGOUT':
      return 'Signed out';
    case 'REVOKED':
      return 'Ended for them';
    default:
      return 'Ended';
  }
}

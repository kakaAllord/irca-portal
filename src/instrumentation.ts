import type { Instrumentation } from 'next';
import { visitorHeaders } from '@/shared';
/* eslint-disable no-console -- the portal's own log is the last place an unreported error can go */

/**
 * Sends every error the portal's server hits while rendering a page to the
 * API, under the digest the error page shows, so the reference someone reads
 * out can be looked up in Dev → Errors (docs/plan/11, step 11.3).
 *
 * Sent as the person who saw it, with their session cookie, so the API knows
 * who it was and whether they were viewing as someone. When the page failed
 * because an API call underneath it failed, that request's id goes too, which
 * links the page to the API's own record of what went wrong.
 *
 * It must never throw and must be awaited (Next's own rule): anything that
 * goes wrong here is written to the portal's log, and the page carries on
 * showing its error.
 *
 * A page most often fails because the API cannot be reached, while it
 * restarts or is being deployed, which is exactly when the report cannot be
 * delivered either. So a report that fails that way is kept and sent again
 * for about nine minutes, until the API is back: the reference the person
 * read out is then there to be looked up. A report the API refuses (4xx) is
 * not sent again, because sending it again changes nothing.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  try {
    // React may hand over its own copy of the error, so it is read by shape.
    const e = (typeof err === 'object' && err !== null ? err : {}) as {
      digest?: unknown;
      message?: unknown;
      stack?: unknown;
      name?: unknown;
      requestId?: unknown;
      status?: unknown;
      code?: unknown;
    };
    const digest = typeof e.digest === 'string' ? e.digest : null;
    // Redirects and not-found travel as errors too, with digests of their own.
    if (!digest || digest.startsWith('NEXT_')) return;
    // The browser went away mid-answer (a prefetch overtaken by a click, a
    // tab closed): nobody saw an error page, so there is nothing to look up.
    if (e.name === 'AbortError' || /stream closed early|aborted/i.test(String(e.message))) return;

    const api = process.env.API_INTERNAL_URL;
    const name = process.env.SESSION_COOKIE_NAME ?? 'irca_session';
    const cookie = header(request.headers.cookie);
    const session = cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    if (!api || !session) {
      console.error(`[error ${digest}] ${request.method} ${request.path}`, err);
      return;
    }

    const report: Report = {
      digest,
      url: `${api}/v1/errors`,
      headers: {
        cookie: session,
        'content-type': 'application/json',
        'x-irca-client': 'portal',
        'x-forwarded-for': header(request.headers['x-forwarded-for']),
        ...visitorHeaders(header(request.headers['x-forwarded-for']), process.env.FORWARDING_KEY),
      },
      body: JSON.stringify({
        source: 'server',
        reference: digest,
        message: `${typeof e.name === 'string' ? e.name : 'Error'}: ${typeof e.message === 'string' ? e.message : String(err)}`,
        stack: typeof e.stack === 'string' ? e.stack : undefined,
        // A prefetch carries a cache-busting _rsc parameter; the page is the same.
        path: request.path.replace(/[?&]_rsc=[^&]*/, '').replace(/^([^?]*)&/, '$1?'),
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource,
        requestId: typeof e.requestId === 'string' ? e.requestId : undefined,
        status: typeof e.status === 'number' ? e.status : undefined,
        code: typeof e.code === 'string' ? e.code : undefined,
      }),
      tries: 0,
      nextAt: 0,
    };
    const sent = await deliver(report);
    if (sent === 'refused') {
      console.error(`[error ${digest}] the API refused the report`, err);
    } else if (sent === 'unreachable') {
      console.error(
        `[error ${digest}] the API could not be reached; the report will be sent again`,
        err,
      );
      keep(report);
    }
  } catch (reporting) {
    console.error('Could not report an error to the API', reporting, err);
  }
};

type Report = {
  digest: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  tries: number;
  nextAt: number;
};

/** How long to wait before each try again: about nine minutes in all. */
const AGAIN_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];
/** A portal failing in a loop keeps at most this many, the newest. */
const MOST_KEPT = 50;
const waiting = new Map<string, Report>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function deliver(r: Report): Promise<'sent' | 'refused' | 'unreachable'> {
  try {
    const res = await fetch(r.url, {
      method: 'POST',
      headers: r.headers,
      body: r.body,
      signal: AbortSignal.timeout(3_000),
    });
    if (res.ok) return 'sent';
    return res.status >= 500 ? 'unreachable' : 'refused';
  } catch {
    return 'unreachable';
  }
}

/** Keeps a report to send again, once per reference. */
function keep(r: Report) {
  r.nextAt = Date.now() + AGAIN_MS[0]!;
  waiting.delete(r.digest);
  waiting.set(r.digest, r);
  while (waiting.size > MOST_KEPT) waiting.delete(waiting.keys().next().value!);
  wake();
}

function wake() {
  if (timer || !waiting.size) return;
  const soonest = Math.min(...[...waiting.values()].map((r) => r.nextAt));
  timer = setTimeout(() => void again(), Math.max(0, soonest - Date.now()));
  // Never what keeps the portal's process alive.
  timer.unref?.();
}

async function again() {
  timer = null;
  for (const r of [...waiting.values()]) {
    if (r.nextAt > Date.now()) continue;
    const sent = await deliver(r);
    if (sent === 'unreachable' && r.tries + 1 < AGAIN_MS.length) {
      r.tries += 1;
      r.nextAt = Date.now() + AGAIN_MS[r.tries]!;
      continue;
    }
    waiting.delete(r.digest);
    if (sent === 'sent') console.info(`[error ${r.digest}] reported now that the API is back`);
    else
      console.error(`[error ${r.digest}] could not be reported (${sent}); it is only in this log`);
  }
  wake();
}

const header = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join(', ') : (value ?? '');

import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { visitorHeaders } from '@/shared';
import { readApiError } from './errors';
import { sessionCookieName } from '@/lib/auth/session-cookie';

const API = () => {
  const url = process.env.API_INTERNAL_URL;
  if (!url) throw new Error('API_INTERNAL_URL is not set. Copy .env.example to .env.local.');
  return url;
};

/** The header proxy.ts sets, so a server component knows which page it is rendering. */
export const PATH_HEADER = 'x-irca-path';

type Options = RequestInit & {
  /**
   * What a 401 means for this call. 'redirect' (the default) sends the person
   * to sign in and back here afterwards; 'null' returns null instead, for pages
   * that work either way, such as the sign-in page itself.
   */
  onUnauthorized?: 'redirect' | 'null';
};

/**
 * Calls the API from the portal's server, as the signed-in person.
 *
 * Forwards the session cookie and the visitor's address, and never caches: every
 * answer here is about one person.
 */
export async function serverApi<T>(
  path: string,
  init: Options & { onUnauthorized: 'null' },
): Promise<T | null>;
export async function serverApi<T>(path: string, init?: Options): Promise<T>;
export async function serverApi<T>(path: string, init: Options = {}): Promise<T | null> {
  const { onUnauthorized = 'redirect', ...rest } = init;
  const jar = await cookies();
  const h = await headers();
  const name = sessionCookieName();
  const token = jar.get(name)?.value;

  const res = await fetch(`${API()}/v1${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      ...rest.headers,
      ...(token ? { cookie: `${name}=${token}` } : {}),
      'x-irca-client': 'portal',
      'x-forwarded-for': h.get('x-forwarded-for') ?? '',
      ...visitorHeaders(h.get('x-forwarded-for'), process.env.FORWARDING_KEY),
      ...(rest.body ? { 'content-type': 'application/json' } : {}),
    },
  });

  if (res.status === 401) {
    if (onUnauthorized === 'null') return null;
    const here = h.get(PATH_HEADER) ?? '/';
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }
  if (!res.ok) throw await readApiError(res);
  return res.status === 204 ? null : ((await res.json()) as T);
}

/**
 * Wakes the API's database. Neon's free plan puts it to sleep when nobody has
 * used it for a few minutes, and the first query after that waits for it. A
 * visitor opening the sign-in page is about to make one, so this asks now,
 * while they type, and ignores the answer. Only a person's visit calls it,
 * never a clock, so a quiet system stays asleep (D51).
 */
export async function warmApi(): Promise<void> {
  try {
    await fetch(`${API()}/health?db=1`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  } catch {
    // Warming is a courtesy; the sign-in works the same without it.
  }
}

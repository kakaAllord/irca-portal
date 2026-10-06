import { NextResponse, type NextRequest } from 'next/server';
import {
  FORWARDING_KEY_HEADER,
  NO_REFERRER,
  VISITOR_HEADER,
  carriesToken,
  contentSecurityPolicy,
  visitorHeaders,
} from '@/shared';

/** Pages anyone may open. Everything else needs to be signed in. */
const PUBLIC = ['/login', '/forgot-password', '/reset-password', '/accept-invite'];

/**
 * Runs before every page, and before every call to the API. For a page:
 *
 * 1. Someone with no session cookie at all is sent straight to sign-in, with
 *    the page they wanted remembered. This only saves a round trip for the
 *    obvious case: whether a cookie is still valid is the API's call, made by
 *    the signed-in layout.
 * 2. Every page is told which path it is rendering (x-irca-path), so a server
 *    component that finds the session expired can send the person back here
 *    after they sign in again.
 * 3. Every page gets a fresh nonce and a content policy built around it. Next
 *    puts the nonce on its own scripts and inline styles; anything else a
 *    browser is told to run is refused. The pages whose address is itself a
 *    secret — a reset link, an invitation — send no Referer at all.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/')) return toApi(request);
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'irca_session';
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isPublic && !request.cookies.has(cookieName)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === 'development',
  });

  const headers = new Headers(request.headers);
  headers.set('x-irca-path', pathname + search);
  headers.set('x-nonce', nonce);
  // Next reads the policy from the request headers to find the nonce it must
  // stamp on its own tags, and the browser reads it from the response.
  headers.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  if (carriesToken(pathname)) response.headers.set(NO_REFERRER.key, NO_REFERRER.value);
  return response;
}

/**
 * A call on its way through the rewrite to the API. When the portal runs on
 * another host than the API, it says who the visitor is, so the API's
 * per-address limits do not count everyone as Vercel (D48). Whatever the
 * browser itself sent under those names is dropped first.
 */
function toApi(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete(VISITOR_HEADER);
  headers.delete(FORWARDING_KEY_HEADER);
  const visitor = visitorHeaders(
    request.headers.get('x-forwarded-for'),
    process.env.FORWARDING_KEY,
  );
  for (const [name, value] of Object.entries(visitor)) headers.set(name, value);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Every API call, and every page: not Next's own files or static assets.
  matcher: [
    '/api/:path*',
    '/((?!api/|_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)',
  ],
};

/**
 * How a front end on another host tells the API who the visitor is (D48).
 *
 * The API counts sign-in attempts and other limits per visitor address, and
 * writes the address into the audit log. When the portal and the form run on
 * Vercel, every request reaches the API from Vercel, and Caddy in front of the
 * API replaces any X-Forwarded-For it is sent with Vercel's own address, as it
 * must: anyone on the internet can send that header. So the front end passes
 * the address in a header of its own, next to a key only it and the API know,
 * and the API believes the address only when the key matches.
 *
 * Off by default: with no key set, nothing is sent and the API reads the
 * address the way it always has (TRUST_PROXY).
 */
export const VISITOR_HEADER = 'x-irca-visitor';
export const FORWARDING_KEY_HEADER = 'x-irca-forwarding-key';

/**
 * The headers a front end's server adds to a request it sends to the API.
 *
 * `forwardedFor` is the X-Forwarded-For the front end itself was sent. Its
 * first entry is the visitor only because the host in front of the front end
 * (Vercel, or Caddy on the same machine) writes the header itself and drops
 * whatever the browser put there. Set the key only on a host that does.
 */
export function visitorHeaders(
  forwardedFor: string | null | undefined,
  key: string | undefined,
): Record<string, string> {
  const visitor = forwardedFor?.split(',')[0]?.trim();
  if (!key || !visitor) return {};
  return { [VISITOR_HEADER]: visitor.slice(0, 64), [FORWARDING_KEY_HEADER]: key };
}

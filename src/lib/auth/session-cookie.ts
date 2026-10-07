/**
 * The session cookie's name: the same choice the API makes. Unset, it is
 * `__Host-irca_session` in production, which browsers accept only over HTTPS
 * from this exact host, and `irca_session` in development, where there is no
 * HTTPS. Set SESSION_COOKIE_NAME only to match an API that sets it too.
 */
export function sessionCookieName(): string {
  return (
    process.env.SESSION_COOKIE_NAME ??
    (process.env.NODE_ENV === 'production' ? '__Host-irca_session' : 'irca_session')
  );
}

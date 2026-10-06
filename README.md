# irca-portal

The IRCA staff portal (Next.js 16). It runs on Vercel and reaches the API in
irca-backend over the internet; neither shares code with the other (D48). How
the system was built, step by step, is in irca-backend's `docs/plan/`.

## First run

The backend must be running first (irca-backend's README). Then, from this
folder:

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Sign in with one of the seeded accounts listed in irca-backend's README.

The browser never calls the API directly: `/api/*` is rewritten to
`API_INTERNAL_URL` (`next.config.ts`), so the session cookie belongs to the
portal's own origin. `API_INTERNAL_URL` must be set when the portal is
**built**, because Next bakes rewrites in at build time.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build   # what CI runs
npm run e2e        # the browser journeys
```

The journeys (`e2e/`) start the backend and the form as well, from
`../backend` and `../registration` unless `IRCA_BACKEND_DIR` and
`IRCA_REGISTRATION_DIR` say otherwise, so they run where all three are
checked out side by side, not in this repository's CI.

## The code in `src/shared`

The rules the portal must agree with the backend on (the permissions, the
registration flow, money) are a copy of irca-backend's. Change both together:
`src/shared/README.md` says how to check they agree.

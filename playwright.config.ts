import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// The journeys run against their own API and portal, on their own ports and
// the test database, so they never collide with servers you have running for
// development.
const API_PORT = 4100;
const PORTAL_PORT = 3100;
const FORM_PORT = 3101;
/**
 * The journeys need the backend and the form running too. They are their own
 * repositories, checked out next to this one unless these say otherwise.
 */
export const BACKEND_DIR = process.env.IRCA_BACKEND_DIR ?? '../backend';
const REGISTRATION_DIR = process.env.IRCA_REGISTRATION_DIR ?? '../registration';

// The test database's URL, as the owner, from the backend's own test settings.
config({ path: `${BACKEND_DIR}/.env.test`, quiet: true });
/**
 * The same database as the registration form reaches it (D49): logged in as
 * the owner here, and switched to irca_form as the connection opens, so the
 * form runs with exactly its production grants.
 */
export function formDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('options', '-c role=irca_form');
  return url.toString();
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORTAL_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Locally, the Chrome already installed; in CI, Playwright's own Chromium.
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: [
    {
      // From the backend's folder, which is where it looks for its .env.test.
      command: 'npm run -s build && node dist/main.js',
      cwd: BACKEND_DIR,
      url: `http://localhost:${API_PORT}/health`,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        PORTAL_ORIGIN: `http://localhost:${PORTAL_PORT}`,
        REGISTRATION_ORIGIN: `http://localhost:${FORM_PORT}`,
        // Every journey signs in from this one machine, more than ten a minute.
        SIGN_IN_PER_MINUTE: '100',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Built and served the way it is deployed, not `next dev`: in development
      // the portal recompiles routes on demand and Fast Refresh reloads the
      // page, which cancels a navigation a journey has just started. Rewrites
      // are baked in at build time, so the API's address is set for both.
      command: `npm run -s build && npm run -s start -- -p ${PORTAL_PORT}`,
      url: `http://localhost:${PORTAL_PORT}/login`,
      env: {
        API_INTERNAL_URL: `http://localhost:${API_PORT}`,
        SESSION_COOKIE_NAME: 'irca_session',
      },
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      // The visitor's form, writing the test database itself as irca_form,
      // as it runs since D49. The API's sync job picks its rows up.
      command: `npm run -s build && npm run -s start -- -p ${FORM_PORT}`,
      cwd: REGISTRATION_DIR,
      url: `http://localhost:${FORM_PORT}/`,
      env: { DATABASE_URL: formDatabaseUrl() },
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});

import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { config } from 'dotenv';
import { BACKEND_DIR } from '../playwright.config';
import pg from 'pg';

config({ path: `${BACKEND_DIR}/.env.test`, quiet: true });

const API = 'http://localhost:4100/v1';
const ADMIN = { email: 'admin@irca.local', password: 'admin-password-123' };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(who.email);
  await page.getByLabel(/Password/).fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();
}

/** A write as the portal makes it, with the session the page holds. */
const write = (request: APIRequestContext, method: 'post' | 'put', path: string, data: object) =>
  request[method](`/api${path}`, { data, headers: { 'x-irca-client': 'portal' } });

/** A leadership position's id, from the list administrators keep. */
async function positionIdOf(request: APIRequestContext, name: string) {
  const res = await request.get('/api/admin/leader-positions');
  const list = (await res.json()) as { id: string; name: string }[];
  return list.find((p) => p.name === name)!.id;
}

/** Today in Arusha, as the church's pages read it. */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam' }).format(
  new Date(),
);

/** The number on one dashboard card, for today. */
async function figure(page: Page, label: string) {
  await page.goto(`/outreach?from=${today}&to=${today}`);
  const card = page.getByRole('link', { name: new RegExp(`^${label}`) });
  return Number((await card.innerText()).split('\n')[1]!.replace(/\D/g, ''));
}

/** A figure the dashboard leaves out, read from its own list ("N in all"). */
async function listed(page: Page, key: string) {
  await page.goto(`/outreach/figures/${key}?from=${today}&to=${today}`);
  const text = await page.getByText(/^[\d,]+ in all/).innerText();
  return Number(text.split(' in all')[0]!.replace(/\D/g, ''));
}

/**
 * A GO day, end to end (08 step 8.10): the leader plans it with two teams;
 * at phone width four people are recorded, one of them someone the church
 * already knows; one is followed up twice; the training is marked; and the
 * dashboard's numbers move by exactly that much.
 */
test('a GO day, from planning to the dashboard', async ({ browser, request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString().slice(-6);
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  // Only what the pages cannot make in a minute: a confirmed member to lead,
  // four of the team, and one person the church already knows.
  const leaderPerson = randomUUID();
  await db.query(
    `insert into people (id, full_name, dial, phone, email, stage, lang, updated_at)
     values ($1, $2, '+255', $3, $4, 'CONFIRMED_MEMBER', 'en', now())`,
    [leaderPerson, `Outreach Leader ${stamp}`, `75${stamp}9`, `outreach${stamp}@example.com`],
  );
  const team = ['Peter', 'John', 'Grace', 'Anna'].map((name) => ({
    id: randomUUID(),
    name: `${name} ${stamp}`,
  }));
  // Each filled in the registration form, as every department member has.
  // Already caught up by the API's sync job (D49), as a real member's form
  // would be; otherwise it would copy the form's empty answers over them.
  for (const p of team) {
    const registration = randomUUID();
    await db.query(
      `insert into registrations (id, token, status, submitted_at, updated_at, synced_at, handled_at)
       values ($1, $2, 'submitted', now(), now(), now(), now())`,
      [registration, registration.replace(/-/g, '')],
    );
    await db.query(
      `insert into people (id, registration_id, full_name, stage, updated_at)
       values ($1, $3, $2, 'VISITOR', now())`,
      [p.id, p.name, registration],
    );
  }
  const known = { name: `Neema Known ${stamp}`, phone: `76${stamp}1` };
  await db.query(
    `insert into people (id, full_name, dial, phone, source, updated_at)
     values ($1, $2, '+255', $3, 'OFFICE', now())`,
    [randomUUID(), known.name, known.phone],
  );
  const { rows } = await db.query<{ id: string }>(
    `select id from departments where module_key = 'outreach' and archived_at is null`,
  );
  await db.end();
  const departmentId = rows[0]!.id;

  // An administrator names the leader, who accepts the invitation.
  const adminPage = await browser.newPage();
  await signIn(adminPage, ADMIN);
  await request.delete(`${API}/test/emails`);
  expect(
    (
      await write(adminPage.request, 'post', `/admin/departments/${departmentId}/leaders`, {
        personId: leaderPerson,
        positionId: await positionIdOf(adminPage.request, 'Chairperson'),
      })
    ).status(),
  ).toBe(201);
  let link = '';
  await expect
    .poll(
      async () => {
        const sent = (await (await request.get(`${API}/test/emails`)).json()) as {
          to: string;
          text: string;
        }[];
        link =
          /https?:\/\/\S+/.exec(
            sent.find((e) => e.to === `outreach${stamp}@example.com`)?.text ?? '',
          )?.[0] ?? '';
        return link;
      },
      { timeout: 30_000 },
    )
    .not.toBe('');
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto(new URL(link).pathname + new URL(link).search);
  await page.getByLabel('Choose a password').fill('kilimanjaro sunrise tea');
  await page.getByLabel('Type it again').fill('kilimanjaro sunrise tea');
  await page.getByRole('button', { name: 'Set password and sign in' }).click();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  // Outreach has a portal, so an administrator adds its members, each with
  // the email they would sign in with (D31).
  for (const [i, p] of team.entries()) {
    expect(
      (
        await write(adminPage.request, 'post', `/departments/${departmentId}/members`, {
          personId: p.id,
          email: `team${i}.${stamp}@example.com`,
        })
      ).status(),
    ).toBe(201);
  }

  const reachedBefore = await figure(page, 'People reached');
  const followUpsBefore = await listed(page, 'followups');

  // Plan today's GO day, with two teams.
  await page.goto('/outreach/sessions');
  await page.getByRole('button', { name: 'Plan a GO day' }).click();
  await page.getByLabel('Date').fill(today);
  await page.getByLabel('Title').fill(`Journey ${stamp}`);
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.waitForURL(/\/outreach\/sessions\/[0-9a-f-]+$/);
  for (const [area, people] of [
    [`Sombetini ${stamp}`, team.slice(0, 2)],
    [`Kaloleni ${stamp}`, team.slice(2, 4)],
  ] as const) {
    await page.getByRole('button', { name: '+ Add a team' }).click();
    await page.getByRole('combobox', { name: /Area/ }).fill(area);
    for (const p of people) await page.getByLabel(p.name).check();
    await page.getByRole('button', { name: 'Add the team' }).click();
    await expect(page.getByText(area, { exact: true })).toBeVisible();
  }

  // Four people, two from each team, at phone width. The last is Neema,
  // whom the church already knows: she is matched, not made twice.
  const recordFor = async (area: string, people: { name: string; phone: string }[]) => {
    await page
      .getByRole('listitem')
      .filter({ hasText: area })
      .getByRole('link', { name: 'Record someone' })
      .click();
    await page.waitForURL(/reached\/new/);
    for (const person of people) {
      await page.getByLabel('Name').fill(person.name);
      await page.getByLabel('Phone').fill(person.phone);
      await page.getByLabel('May the church send them messages?').check();
      await page.getByRole('button', { name: 'Save' }).click();
      if (person.name.startsWith('Neema')) {
        await expect(page.getByText('Someone we already know?')).toBeVisible();
        await page.getByRole('button', { name: 'Same person' }).click();
      }
      await expect(page.getByText(`Saved ${person.name}.`)).toBeVisible();
    }
  };
  const session = page.url();
  await recordFor(`Sombetini ${stamp}`, [
    { name: `Baraka ${stamp}`, phone: `077${stamp}1` },
    { name: `Upendo ${stamp}`, phone: `077${stamp}2` },
  ]);
  await page.goto(session);
  await recordFor(`Kaloleni ${stamp}`, [
    { name: `Imani ${stamp}`, phone: `077${stamp}3` },
    { name: `Neema ${stamp}`, phone: `0${known.phone}` },
  ]);

  // The leader attaches the day's report as a PDF; Word files are refused
  // before they are sent.
  await page.goto(session);
  const report = page.locator('section', { has: page.getByRole('heading', { name: 'Report' }) });
  await expect(report.getByText(/No report yet/)).toBeVisible();
  await report.getByLabel('Choose the report, a PDF').setInputFiles({
    name: 'notes.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('PK not a pdf'),
  });
  await expect(report.getByText(/Only a PDF can be attached/)).toBeVisible();
  await report.getByLabel('Choose the report, a PDF').setInputFiles({
    name: `Sombetini ${stamp}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(4096)]),
  });
  await expect(report.getByText(`Sombetini ${stamp}.pdf`)).toBeVisible();
  await expect(report.getByRole('button', { name: 'Attach a new version' })).toBeVisible();

  // Baraka is followed up twice.
  await page.goto(`/outreach/reached?q=${encodeURIComponent(`Baraka ${stamp}`)}`);
  await page.getByRole('link', { name: `Baraka ${stamp}` }).click();
  await page.waitForURL(/\/outreach\/people\//);
  for (const [kind, note] of [
    ['Called', 'will come on Sunday'],
    ['Visited', 'met his mother'],
  ]) {
    await page.getByRole('radio', { name: kind }).click();
    await page.getByLabel('Note').fill(note);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`Saved “${kind}”`)).toBeVisible();
  }
  await expect(page.getByText('Home visit — met his mother')).toBeVisible();

  // The training: two came, and everyone else was absent.
  await page.goto('/outreach/training');
  await page.getByRole('button', { name: 'Plan a training' }).click();
  await page.getByLabel('Topic').fill(`Sharing your story ${stamp}`);
  await page.getByLabel('Date').fill(today);
  await page.getByLabel('Time').fill('00:05');
  await page.getByRole('button', { name: 'Plan it' }).click();
  await page.waitForURL(/\/outreach\/training\/[0-9a-f-]+$/);
  for (const p of team.slice(0, 2)) {
    await page.getByRole('button', { name: `${p.name}: not yet marked` }).click();
    await expect(page.getByRole('button', { name: `${p.name}: attended` })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Everyone else was absent' }).click();
  await expect(page.getByRole('button', { name: `${team[2]!.name}: missed` })).toBeVisible();

  // The dashboard moved by exactly what happened.
  expect(await listed(page, 'followups')).toBe(followUpsBefore + 2);
  expect(await figure(page, 'People reached')).toBe(reachedBefore + 4);
  await page.getByRole('link', { name: /^People reached/ }).click();
  await expect(page.getByRole('link', { name: new RegExp(`Neema Known ${stamp}`) })).toBeVisible();
});

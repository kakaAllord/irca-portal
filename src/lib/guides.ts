/**
 * Every guide, in the order the help page lists them, and who each is for
 * (13.5): you see only the guides for what you use. `for` is the start of
 * the addresses a guide explains: the ? in the top bar opens the guide for
 * the page you are on, if it is one of yours, and the list of guides if not.
 */
export type GuideEntry = {
  href: string;
  title: string;
  about: string;
  /** Whether someone holding these permissions uses what the guide explains. */
  audience: (has: (permission: string) => boolean) => boolean;
  for?: string[];
};

export const GUIDES: GuideEntry[] = [
  {
    href: '/help/getting-started',
    title: 'Getting started',
    about:
      'Accepting your invitation, signing in, what the sidebar shows you, help and signing out, and what "viewing as" means.',
    audience: () => true,
    for: ['/account', '/help'],
  },
  {
    href: '/help/pastors',
    title: 'For the pastors',
    about:
      'Deciding membership applications, reading prayer requests, each department at a glance, and seeing what someone in a department sees.',
    audience: (has) => has('membership.prayers.read'),
    for: ['/membership/prayers', '/membership/applications', '/departments'],
  },
  {
    href: '/help/administrators',
    title: 'For administrators',
    about:
      'The overview, giving someone access, departments and their positions, deciding requests, templates and emergency messages.',
    audience: (has) => has('admin.overview.read'),
    for: ['/admin', '/departments'],
  },
  {
    href: '/help/membership',
    title: 'Membership',
    about:
      'Finding a person, moving them along the journey, visits and calls, applications, and the foundation class register.',
    audience: (has) => has('membership.people.read'),
    for: ['/membership'],
  },
  {
    href: '/help/finance',
    title: 'Finance in five minutes',
    about:
      'Recording an expense, a stack of receipts at once, reading an entry number, voiding a mistake, the statement, and pledge payments.',
    audience: (has) => has('finance.transactions.read'),
    for: ['/finance'],
  },
  {
    href: '/help/communications',
    title: 'Communications',
    about:
      'Sending a message, templates and who approves them, emergency messages, recurring messages, and what it all costs.',
    audience: (has) => has('comms.messages.send') || has('comms.department.send'),
    for: ['/comms'],
  },
  {
    href: '/help/outreach',
    title: 'Outreach',
    about:
      'Planning a GO day, recording someone on a doorstep, following up, Friday training, and the dashboard.',
    audience: (has) => has('outreach.reached.record') || has('outreach.dashboard.read'),
    for: ['/outreach'],
  },
  {
    href: '/help/leading',
    title: 'Leading a department',
    about:
      "Your department's page, adding its members, messaging them with approved words, and writing your own templates.",
    audience: (has) => has('departments.own.read'),
    for: ['/departments'],
  },
  {
    href: '/help/dev',
    title: 'The dev console',
    about:
      'Looking up an error someone was shown, reading the logs, health and alerts, and viewing as someone to help them.',
    audience: (has) => has('dev.health.read'),
    for: ['/dev'],
  },
];

const hasOf = (permissions: readonly string[]) => {
  const held = new Set(permissions);
  return (permission: string) => held.has(permission);
};

/** The guides for someone holding these permissions. */
export function guidesFor(permissions: readonly string[]): GuideEntry[] {
  const has = hasOf(permissions);
  return GUIDES.filter((g) => g.audience(has));
}

/**
 * The guide for the page at `pathname`, among this person's guides: the one
 * whose address matches most closely, the earlier one when two match as
 * closely. Null when none of theirs explains it.
 */
export function guideForPath(pathname: string, permissions: readonly string[]): GuideEntry | null {
  let best: { guide: GuideEntry; length: number } | null = null;
  for (const guide of guidesFor(permissions)) {
    for (const prefix of guide.for ?? []) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
      if (!best || prefix.length > best.length) best = { guide, length: prefix.length };
    }
  }
  return best?.guide ?? null;
}

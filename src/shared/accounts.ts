/**
 * The kinds of account the church has (D30): pastors, administrators and the
 * developer. Everyone else who signs in does so because they lead or belong
 * to a department with a portal (D31), which needs no kind at all.
 *
 * A kind is a bundle of roles defined here, in code. An administrator gives
 * a person a kind in Admin → Users; the developer kind only comes from the
 * command line. What a user is follows from the roles they hold: nothing
 * about kinds is stored, so dividing the work differently later, as the
 * department leaders may ask, is a change here and not a migration.
 */
export type AccountKindKey = 'pastor' | 'administrator' | 'developer';

export type AccountKind = {
  key: AccountKindKey;
  label: string;
  /** What it brings, in the words Admin → Users shows. */
  description: string;
  roles: readonly string[];
  /** Given only by `user:create-dev`, never in the portal. */
  cliOnly?: true;
};

export const ACCOUNT_KINDS: Record<AccountKindKey, AccountKind> = {
  pastor: {
    key: 'pastor',
    label: 'Pastor',
    description:
      'Membership, including deciding applications and reading prayer requests; every department and its summary, read-only; viewing as the people in departments.',
    roles: ['membership.pastor', 'departments.overseer', 'finance.pastor_overseer'],
  },
  administrator: {
    key: 'administrator',
    label: 'Administrator',
    description:
      'People, departments, portals and requests; Membership, deciding applications included, except prayer requests; every department and its summary; viewing as anyone but a pastor.',
    roles: [
      'admin.administrator',
      'membership.administrator',
      'departments.overseer',
      'finance.overseer',
    ],
  },
  developer: {
    key: 'developer',
    label: 'Developer',
    description:
      'The dev console: health, usage, logs, errors, the view-as log, access and settings. Sees the rest by viewing as someone.',
    roles: ['dev.developer'],
    cliOnly: true,
  },
};

export const ACCOUNT_KIND_KEYS = Object.keys(ACCOUNT_KINDS) as AccountKindKey[];

/** The kinds a person is, from the built-in roles they hold: all of a kind's roles, and they are it. */
export function kindsOf(roleKeys: Iterable<string>): AccountKindKey[] {
  const held = new Set(roleKeys);
  return ACCOUNT_KIND_KEYS.filter((k) => ACCOUNT_KINDS[k].roles.every((r) => held.has(r)));
}

/** Every role some kind brings: what giving and taking kinds may touch. */
export const KIND_ROLES: ReadonlySet<string> = new Set(
  ACCOUNT_KIND_KEYS.flatMap((k) => ACCOUNT_KINDS[k].roles),
);

/**
 * The roles a person should hold to be exactly these kinds: every role of
 * each, and none of a kind they are not, unless a kind they are still brings
 * it (both pastors and administrators oversee departments).
 */
export function rolesForKinds(kinds: Iterable<AccountKindKey>): Set<string> {
  return new Set([...kinds].flatMap((k) => ACCOUNT_KINDS[k].roles));
}

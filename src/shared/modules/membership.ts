import { defineModule } from '../rbac/define';

/**
 * The people the church is caring for, from the first Sunday they register to
 * the day they are confirmed as members.
 *
 * Two words, two meanings: a `ChurchMembership` in code is a staff account's
 * access to a church. This portal is about *church members* — `Person`,
 * `MembershipApplication` and the rest. Nothing here calls a Person a member
 * except by their stage.
 *
 * What people wrote on the form in confidence — their faith and family
 * answers, their date of birth — sits behind its own permission.
 *
 * It is the administrators' work and the pastors': both do everything here,
 * deciding applications included (D46); only the pastors read prayer requests
 * (D34). There is no secretary, follow-up team or viewer.
 */
export const membershipModule = defineModule({
  key: 'membership',
  name: 'Membership',
  description: 'Visitors, members, foundation class and what the form tells you.',
  // The administrators' and pastors' portal, not a department's (D34): it
  // cannot be switched off, and a Membership department, if the church keeps
  // one as a ministry, is a department with no portal.
  kind: 'core',
  home: '/membership',
  permissions: {
    'membership.dashboard.read': { kind: 'read', label: 'See the membership dashboard' },
    'membership.people.read': {
      kind: 'read',
      label:
        "See people's names, gender, age group, phone, where they live, how they heard, and their stage",
    },
    'membership.people.read_sensitive': {
      kind: 'read',
      label: 'See email, date of birth, faith and family answers, what they liked, and notes',
    },
    'membership.prayers.read': {
      kind: 'read',
      label: 'Read prayer requests',
      hint: 'For the pastors only. Administrators never see them (D34).',
    },
    'membership.people.update': {
      kind: 'write',
      label: 'Mark saved or baptised, move people between stages, and add people by hand',
    },
    'membership.people.export': { kind: 'read', label: 'Download the list of people as a PDF' },
    'membership.notes.write': { kind: 'write', label: 'Add notes' },
    'membership.applications.read': { kind: 'read', label: 'See membership applications' },
    'membership.applications.submit': {
      kind: 'write',
      label: 'Enter a membership application for someone',
    },
    'membership.applications.decide': {
      kind: 'write',
      label: 'Approve, reject and confirm applications',
      hint: 'The pastors and the administrators (D46).',
    },
    'membership.discipleship.read': { kind: 'read', label: 'See foundation classes and progress' },
    'membership.discipleship.manage': {
      kind: 'write',
      label: 'Run foundation classes: groups, sign-ups and attendance',
    },
    'membership.insights.read': { kind: 'read', label: 'See insights' },
    'membership.registrations.remind': {
      kind: 'write',
      label: 'Send people their link to finish the registration form',
      hint: 'Copy it, or text it with an approved template, from Registrations and Members (D55).',
    },
  },
  systemRoles: [
    {
      key: 'membership.pastor',
      name: 'Pastor',
      description: 'Everything, including prayer requests and deciding applications.',
      permissions: [
        'membership.dashboard.read',
        'membership.people.read',
        'membership.people.read_sensitive',
        'membership.prayers.read',
        'membership.people.update',
        'membership.people.export',
        'membership.notes.write',
        'membership.applications.read',
        'membership.applications.submit',
        'membership.applications.decide',
        'membership.discipleship.read',
        'membership.discipleship.manage',
        'membership.insights.read',
        'membership.registrations.remind',
      ],
    },
    {
      key: 'membership.administrator',
      name: 'Membership administrator',
      description: 'Everything a pastor can, except reading prayer requests (D34, D46).',
      permissions: [
        'membership.dashboard.read',
        'membership.people.read',
        'membership.people.read_sensitive',
        'membership.people.update',
        'membership.people.export',
        'membership.notes.write',
        'membership.applications.read',
        'membership.applications.submit',
        'membership.applications.decide',
        'membership.discipleship.read',
        'membership.discipleship.manage',
        'membership.insights.read',
        'membership.registrations.remind',
      ],
    },
  ],
  nav: [
    {
      label: 'Dashboard',
      href: '/membership',
      icon: 'dashboard',
      permission: 'membership.dashboard.read',
    },
    {
      // Everyone who ever registered, and everyone added by hand.
      label: 'Registrations',
      href: '/membership/people',
      icon: 'people',
      permission: 'membership.people.read',
    },
    {
      // Only those the pastors have confirmed, with their member numbers.
      label: 'Members',
      href: '/membership/members',
      icon: 'members',
      permission: 'membership.people.read',
    },
    {
      label: 'Applications',
      href: '/membership/applications',
      icon: 'applications',
      permission: 'membership.applications.read',
    },
    {
      label: 'Discipleship',
      href: '/membership/discipleship',
      icon: 'discipleship',
      permission: 'membership.discipleship.read',
    },
    {
      label: 'Insights',
      href: '/membership/insights',
      icon: 'insights',
      permission: 'membership.insights.read',
    },
    {
      label: 'Prayers',
      href: '/membership/prayers',
      icon: 'prayers',
      permission: 'membership.prayers.read',
    },
  ],
});

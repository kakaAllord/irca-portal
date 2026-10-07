import { defineModule } from '../rbac/define';

const ALL = [
  'outreach.dashboard.read',
  'outreach.team.read',
  'outreach.groups.manage',
  'outreach.sessions.read',
  'outreach.sessions.manage',
  'outreach.reached.read',
  'outreach.reached.record',
  'outreach.training.read',
  'outreach.training.manage',
  'outreach.reports.read',
  'outreach.reports.upload',
];

/**
 * Evangelism: the team, the GO days, the people reached and the follow-up.
 *
 * The team is the Outreach department itself (D28). Its leaders run this
 * portal by leading the department (D29), recording who was reached as well,
 * and need no role. Its members go out with the teams but do not sign in
 * (D57, replacing D33's split), so its leaders keep them, as any department's
 * do.
 *
 * Someone reached on a doorstep becomes a person in the church's one list
 * (D23). What this portal shows about them — name, phone, area and timeline —
 * it shows only for people it reached, behind its own permission, and never
 * the rest of People: Membership keeps that, and what people wrote in
 * confidence, behind its own.
 */
export const outreachModule = defineModule({
  key: 'outreach',
  name: 'Outreach',
  description: 'Evangelism: the team, the GO days, the people reached and the follow-up.',
  kind: 'department',
  home: '/outreach',
  permissions: {
    'outreach.dashboard.read': { kind: 'read', label: 'See the Outreach dashboard' },
    'outreach.team.read': { kind: 'read', label: 'See the team and its partner groups' },
    'outreach.groups.manage': { kind: 'write', label: 'Make and change partner groups' },
    'outreach.sessions.read': { kind: 'read', label: 'See the GO days' },
    'outreach.sessions.manage': {
      kind: 'write',
      label: 'Plan a GO day, send teams to areas, and close it',
    },
    'outreach.reached.read': {
      kind: 'read',
      label: 'See the people reached, with their phone numbers, and their timelines',
      hint: 'Only people Outreach reached. The rest of People stays in Membership.',
    },
    'outreach.reached.record': {
      kind: 'write',
      label: 'Record someone reached, and follow them up',
    },
    'outreach.training.read': { kind: 'read', label: 'See the Friday training' },
    'outreach.training.manage': { kind: 'write', label: 'Plan training and mark who came' },
    'outreach.reports.read': { kind: 'read', label: 'See and download session reports' },
    'outreach.reports.upload': { kind: 'write', label: 'Attach a session report' },
  },
  leaders: {
    description:
      'Leaders of the Outreach department run it: the partner groups, the GO days, who was reached and their follow-up, the training and the reports. Its members go out with the teams and do not sign in (D57).',
    permissions: ALL,
  },
  systemRoles: [],
  nav: [
    {
      label: 'Dashboard',
      href: '/outreach',
      icon: 'dashboard',
      permission: 'outreach.dashboard.read',
    },
    {
      label: 'GO days',
      href: '/outreach/sessions',
      icon: 'sessions',
      permission: 'outreach.sessions.read',
    },
    {
      label: 'Reached',
      href: '/outreach/reached',
      icon: 'people',
      permission: 'outreach.reached.read',
    },
    {
      label: 'Follow-up',
      href: '/outreach/followup',
      icon: 'discipleship',
      permission: 'outreach.reached.read',
    },
    { label: 'Team', href: '/outreach/team', icon: 'roles', permission: 'outreach.team.read' },
    {
      label: 'Training',
      href: '/outreach/training',
      icon: 'training',
      permission: 'outreach.training.read',
    },
  ],
});

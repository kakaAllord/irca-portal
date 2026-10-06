import { defineModule } from '../rbac/define';

/**
 * Communications: the text messages the church sends, and the standards they
 * follow (D21, as amended by D28).
 *
 * Central control and decentralised sending. This portal holds the Beem
 * account, passes the words of every department's template, sends to the
 * whole church, to departments and to their leaders, and sees what it all
 * cost. A department's leaders send their own routine messages without
 * asking — because the words were approved once, when they were written —
 * and that comes from leading the department, not from a role here: the
 * three `comms.department.*` permissions are held by being a leader.
 *
 * Who works here is the Communications department, every one of them doing
 * everything (D31, D32). A template's final approval, and an emergency
 * message's, is an administrator's (D37).
 */
/** Everything in the Communications portal, which everyone in it holds (D32). */
const ALL = [
  'comms.messages.read',
  'comms.messages.send',
  'comms.messages.send_adhoc',
  'comms.messages.cancel',
  'comms.templates.read',
  'comms.templates.draft',
  'comms.templates.approve',
  'comms.audiences.read',
  'comms.audiences.manage',
  'comms.schedules.read',
  'comms.schedules.manage',
  'comms.costs.read',
  'comms.settings.manage',
  'comms.registrations.remind',
];

export const commsModule = defineModule({
  key: 'comms',
  name: 'Communications',
  description: 'Messages the church sends, and the standards they follow.',
  kind: 'department',
  home: '/comms',
  permissions: {
    'comms.messages.read': { kind: 'read', label: 'See every message the church sent' },
    'comms.messages.send': {
      kind: 'write',
      label: 'Send to the whole church, to departments and to their leaders',
    },
    'comms.messages.send_adhoc': {
      kind: 'write',
      label: 'Write words no template covers, for an emergency',
      hint: 'The road is flooded, the service is cancelled. It waits for an administrator before it goes (D37).',
    },
    'comms.messages.cancel': { kind: 'write', label: 'Stop a scheduled or sending message' },
    'comms.templates.read': { kind: 'read', label: 'See message templates' },
    'comms.templates.draft': { kind: 'write', label: 'Write and change templates' },
    'comms.templates.approve': {
      kind: 'write',
      label: "Pass a department's template on to an administrator",
      hint: "Communications' step of two (D37); an administrator gives the final approval. Nobody passes their own.",
    },
    'comms.audiences.read': { kind: 'read', label: 'See who the audiences are' },
    'comms.audiences.manage': {
      kind: 'write',
      label: 'Give departments the use of church-wide audiences',
    },
    'comms.schedules.read': { kind: 'read', label: 'See recurring messages' },
    'comms.schedules.manage': { kind: 'write', label: 'Set up recurring messages' },
    'comms.costs.read': { kind: 'read', label: 'See what messages cost and the credit left' },
    'comms.settings.manage': {
      kind: 'write',
      label: 'Set the Beem account, the sender name, the daily limit and the price',
      hint: 'The Beem key and secret are never shown again once saved.',
    },
    'comms.registrations.remind': {
      kind: 'write',
      label: 'See who has not finished the registration form, and send them their link',
      hint: 'Moved from Membership: reminding people is Communications’ work (D34).',
    },
    'comms.department.read': {
      kind: 'read',
      label: 'See the messages and templates of the departments you lead',
      fromLeadership: true,
    },
    'comms.department.draft': {
      kind: 'write',
      label: 'Draft templates for the departments you lead, and ask for approval',
      fromLeadership: true,
    },
    'comms.department.send': {
      kind: 'write',
      label: 'Send approved templates to the departments you lead',
      fromLeadership: true,
    },
  },
  // D32: everyone in Communications does everything; accounts are there to
  // know who did what. The one thing that is not theirs alone is the final
  // word on a template or an emergency message, which is an administrator's
  // (D37), and no permission here grants it.
  leaders: {
    description: 'Leaders of the Communications department do everything in Communications.',
    permissions: ALL,
  },
  members: {
    description:
      'Members of the Communications department do everything in Communications, as its leaders do. Templates and emergency messages still go to an administrator.',
    permissions: ALL,
  },
  systemRoles: [],
  nav: [
    { label: 'Overview', href: '/comms', icon: 'overview', permission: 'comms.messages.read' },
    {
      label: 'Compose',
      href: '/comms/compose',
      icon: 'messages',
      permission: 'comms.messages.send',
    },
    {
      label: 'History',
      href: '/comms/history',
      icon: 'activity',
      permission: 'comms.messages.read',
    },
    {
      label: 'Templates',
      href: '/comms/templates',
      icon: 'templates',
      permission: 'comms.templates.read',
    },
    {
      label: 'Recurring',
      href: '/comms/schedules',
      icon: 'schedule',
      permission: 'comms.schedules.read',
    },
    {
      label: 'Audiences',
      href: '/comms/audiences',
      icon: 'people',
      permission: 'comms.audiences.read',
    },
    {
      label: 'Unfinished registrations',
      href: '/comms/unfinished',
      icon: 'applications',
      permission: 'comms.registrations.remind',
    },
    {
      label: 'Settings',
      href: '/comms/settings',
      icon: 'settings',
      permission: 'comms.settings.manage',
    },
  ],
});

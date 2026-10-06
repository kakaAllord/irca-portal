import { defineModule } from '../rbac/define';

/**
 * The developer's portal: the health of the system, its logs, and the view-as
 * log.
 *
 * An ordinary module now. It used to be a rank above the church — a platform
 * role that saw every church at once — and there is no "above" any more: this
 * deployment serves one church, and the developer is that church's developer.
 * So the console is switched on and granted like any other portal, and an
 * administrator who wants it can hold the role (Q1: audited, not blocked).
 */
export const devModule = defineModule({
  key: 'dev',
  name: 'Dev console',
  description: 'The health of the system, its logs, and who viewed as whom.',
  kind: 'core',
  home: '/dev',
  permissions: {
    'dev.health.read': { kind: 'read', label: 'See how the system is doing' },
    'dev.usage.read': { kind: 'read', label: 'See usage over time' },
    'dev.logs.read': {
      kind: 'read',
      label: 'Read the server log, what people did, and the errors they were shown',
      hint: 'The recent lines the server wrote, the actions behind them, and every error reference, to look up.',
    },
    'dev.users.impersonate': {
      kind: 'read',
      label: 'View the portal as anyone',
    },
    'dev.impersonations.read': {
      kind: 'read',
      label: 'Read the view-as log',
      hint: 'The only place anyone can see who viewed as whom.',
    },
    'dev.access.read': {
      kind: 'read',
      label: 'See every role, what it allows, and who holds what',
      hint: 'Read-only. Roles are the engine underneath; nobody edits them in the portal (D43).',
    },
    'dev.church.manage': {
      kind: 'write',
      label: "Change the church's settings and the registration form's keys",
      hint: 'Its name, code, clock and currency. The code is frozen once there are finance entries.',
    },
  },
  systemRoles: [
    {
      key: 'dev.developer',
      name: 'Developer',
      description: 'Reads the health, the logs and the view-as log, and can view as anyone.',
      permissions: [
        'dev.health.read',
        'dev.usage.read',
        'dev.logs.read',
        'dev.users.impersonate',
        'dev.impersonations.read',
        'dev.access.read',
        'dev.church.manage',
      ],
    },
  ],
  nav: [
    { label: 'Health', href: '/dev', icon: 'health', permission: 'dev.health.read' },
    { label: 'Usage', href: '/dev/usage', icon: 'usage', permission: 'dev.usage.read' },
    { label: 'Logs', href: '/dev/logs', icon: 'terminal', permission: 'dev.logs.read' },
    { label: 'Errors', href: '/dev/errors', icon: 'errors', permission: 'dev.logs.read' },
    {
      label: 'View-as log',
      href: '/dev/impersonations',
      icon: 'activity',
      permission: 'dev.impersonations.read',
    },
    { label: 'Access', href: '/dev/access', icon: 'access', permission: 'dev.access.read' },
    { label: 'Settings', href: '/dev/settings', icon: 'settings', permission: 'dev.church.manage' },
  ],
});

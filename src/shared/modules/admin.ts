import { defineModule } from '../rbac/define';

/**
 * The church's own administration: who has access, which portals are on, the
 * departments, and what has been changed. Always on, because a church without
 * it could never give anyone else access.
 *
 * Roles are not here since D43: they are the engine underneath, read by the
 * developer on Dev → Access.
 */
export const adminModule = defineModule({
  key: 'admin',
  name: 'Admin',
  description: 'People, access and portals for this church.',
  kind: 'core',
  home: '/admin',
  permissions: {
    'admin.overview.read': {
      kind: 'read',
      label: 'See the overview of what needs an administrator',
    },
    'admin.users.read': { kind: 'read', label: 'See who has access' },
    'admin.users.invite': { kind: 'write', label: 'Invite new people' },
    'admin.users.manage': { kind: 'write', label: 'Change roles, disable and re-enable people' },
    'admin.users.impersonate': {
      kind: 'read',
      label: 'View the portal as another person (read-only)',
      hint: 'Every use is logged for the platform team. The person viewed is not told.',
    },
    'admin.modules.read': { kind: 'read', label: 'See which portals are on' },
    'admin.modules.manage': { kind: 'write', label: 'Turn portals on and off' },
    'admin.requests.read': { kind: 'read', label: 'See change requests from every portal' },
    'admin.requests.decide': { kind: 'write', label: 'Approve or reject change requests' },
    'admin.departments.read': {
      kind: 'read',
      label: 'See every department, its leaders and its members',
    },
    'admin.departments.manage': {
      kind: 'write',
      label:
        'Create departments, give them their portal, name their leaders, and add the members of those with a portal',
      hint: 'Only a confirmed member can be named a leader. Adding someone to Finance, Communications or Outreach opens that portal for them (D31); other departments keep their own members.',
    },
    'admin.audit.read': { kind: 'read', label: 'Read the activity log' },
    'admin.templates.decide': {
      kind: 'write',
      label: 'Give a message template its final approval, or send it back',
      hint: 'After Communications has passed it (D37). Nobody approves words they wrote.',
    },
    'admin.messages.decide': {
      kind: 'write',
      label: 'Let an emergency message go, or stop it',
      hint: 'Words no template covers wait for an administrator before they are sent (D37).',
    },
    'admin.church.manage': { kind: 'write', label: 'Edit church details' },
  },
  systemRoles: [
    {
      key: 'admin.administrator',
      name: 'Church administrator',
      description: 'Full control of people, portals, departments and change requests.',
      permissions: [
        'admin.overview.read',
        'admin.users.read',
        'admin.users.invite',
        'admin.users.manage',
        'admin.users.impersonate',
        'admin.modules.read',
        'admin.modules.manage',
        'admin.requests.read',
        'admin.requests.decide',
        'admin.departments.read',
        'admin.departments.manage',
        'admin.audit.read',
        'admin.church.manage',
        'admin.templates.decide',
        'admin.messages.decide',
      ],
    },
  ],
  nav: [
    { label: 'Overview', href: '/admin', icon: 'overview', permission: 'admin.overview.read' },
    {
      label: 'Requests',
      href: '/admin/requests',
      icon: 'requests',
      permission: 'admin.requests.read',
    },
    { label: 'Users', href: '/admin/users', icon: 'people', permission: 'admin.users.read' },
    {
      label: 'Departments',
      href: '/admin/departments',
      icon: 'departments',
      permission: 'admin.departments.read',
    },
    { label: 'Portals', href: '/admin/portals', icon: 'portals', permission: 'admin.modules.read' },
    { label: 'Activity', href: '/admin/audit', icon: 'activity', permission: 'admin.audit.read' },
  ],
});

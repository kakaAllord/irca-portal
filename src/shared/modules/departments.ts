import { defineModule } from '../rbac/define';

/**
 * What a department's leaders see: the departments they lead, and the people
 * in them (D28). Nobody is given those: leading a department is what holds
 * them, so they arrive when an administrator names someone a leader and are
 * gone the moment that leadership ends.
 *
 * And what pastors and administrators oversee: every department, read-only,
 * with its summary, and viewing as the people in them (D35, D36), through
 * the Departments overseer role their account kind brings. Always on,
 * because it belongs to no department.
 */
export const departmentsModule = defineModule({
  key: 'departments',
  name: 'Departments',
  description: 'The departments you lead, and who is in them.',
  kind: 'core',
  home: '/departments',
  permissions: {
    'departments.own.read': {
      kind: 'read',
      label: 'See the departments you lead, their leaders and their members',
      fromLeadership: true,
    },
    'departments.own.members': {
      kind: 'write',
      label: 'Add and remove members of the departments you lead',
      hint: 'Departments without a portal only: an administrator adds the members of Finance, Communications and Outreach (D31).',
      fromLeadership: true,
    },
    'departments.all.read': {
      kind: 'read',
      label: 'See every department, its leaders with their positions, and its members',
    },
    'departments.summary.read': {
      kind: 'read',
      label: "See each department's summary, in numbers",
    },
    'departments.people.impersonate': {
      kind: 'read',
      label: 'View the portal as a leader or member of a department (read-only)',
      hint: 'For the pastors (D36): never as a pastor, and never as someone in no department.',
    },
  },
  systemRoles: [
    {
      key: 'departments.overseer',
      name: 'Departments overseer',
      description:
        'For pastors and administrators: every department, its leaders and members, and its summary, read-only.',
      permissions: [
        'departments.all.read',
        'departments.summary.read',
        'departments.people.impersonate',
      ],
    },
  ],
  nav: [
    {
      label: 'Departments',
      href: '/departments/all',
      icon: 'departments',
      permission: 'departments.all.read',
      children: 'departments',
    },
    {
      label: 'My departments',
      href: '/departments',
      icon: 'departments',
      permission: 'departments.own.read',
    },
  ],
});

import { defineModule } from '../rbac/define';

/** Everything in the Finance portal, which everyone in Finance holds (D32). */
const ALL = [
  'finance.overview.read',
  'finance.transactions.read',
  'finance.transactions.create',
  'finance.transactions.request_change',
  'finance.transactions.export',
  'finance.catalog.read',
  'finance.catalog.create',
  'finance.catalog.manage',
  'finance.accounts.read',
  'finance.accounts.manage',
  'finance.budgets.read',
  'finance.budgets.manage',
  'finance.reports.read',
  'finance.pledges.read',
  'finance.pledges.read_sensitive',
  'finance.pledges.manage',
  'finance.pledges.record_payment',
];

/**
 * Money in and money out.
 *
 * Entries are never deleted and never edited directly: a correction, a void
 * included, is a request an administrator approves (D17). That is why there is
 * a permission to *ask* for a change and none to make one.
 *
 * Who works here is the Finance department: an administrator adds its
 * leaders and members, and each of them may do everything (D31, D32).
 * Pastors and administrators oversee it from a summary, not from inside.
 */
export const financeModule = defineModule({
  key: 'finance',
  name: 'Finance',
  description: 'Income, expenses and reports.',
  kind: 'department',
  home: '/finance',
  permissions: {
    'finance.overview.read': { kind: 'read', label: 'See the finance overview' },
    'finance.transactions.read': { kind: 'read', label: 'See income and expense entries' },
    'finance.transactions.create': { kind: 'write', label: 'Record income and expenses' },
    'finance.transactions.request_change': {
      kind: 'write',
      label: 'Ask an administrator to correct or void an entry',
      hint: 'Entries are never changed directly. An administrator approves each change.',
    },
    'finance.transactions.export': { kind: 'read', label: 'Download entries as a PDF' },
    'finance.catalog.read': { kind: 'read', label: 'See income sources and expense items' },
    'finance.catalog.create': {
      kind: 'write',
      label: 'Add a new income source or expense item while recording',
    },
    'finance.catalog.manage': {
      kind: 'write',
      label: 'Rename and turn off income sources and expense items',
    },
    'finance.accounts.read': {
      kind: 'read',
      label: 'See payment methods and accounts, with their balances',
    },
    'finance.accounts.manage': {
      kind: 'write',
      label: 'Add, rename and turn off payment methods and accounts',
      hint: "Once an account has entries, its currency and opening balance change only through an administrator's approval.",
    },
    'finance.budgets.read': {
      kind: 'read',
      label: "See each department's monthly budget, and what it has used",
    },
    'finance.budgets.manage': {
      kind: 'write',
      label: "Set and change each department's monthly budget",
    },
    'finance.reports.read': { kind: 'read', label: 'See reports and statements' },
    'finance.pledges.read': {
      kind: 'read',
      label: 'See pledge campaigns and their progress',
      hint: 'Totals and counts only. Who owes what needs the next permission.',
    },
    'finance.pledges.read_sensitive': {
      kind: 'read',
      label: 'See who pledged, and what each person still owes',
      hint: 'Names against amounts: everyone in Finance, and the pastors (D32, D41). Administrators see totals only.',
    },
    'finance.pledges.manage': {
      kind: 'write',
      label: 'Open campaigns, record pledges and cancel them',
    },
    'finance.pledges.record_payment': {
      kind: 'write',
      label: 'Record a payment towards a pledge, and ask for one to be corrected',
      hint: 'Finds the one person paying by name; does not open the list of who owes.',
    },
    'finance.summary.read': {
      kind: 'read',
      label: "See Finance's summary under Departments, in numbers",
      hint: 'For pastors and administrators, who oversee Finance without working in it (D41).',
    },
  },
  // D32: everyone in Finance does everything. Separate accounts are there to
  // know who did what and when, not to divide the work.
  leaders: {
    description: 'Leaders of the Finance department do everything in Finance.',
    permissions: ALL,
  },
  members: {
    description:
      'Members of the Finance department do everything in Finance, as its leaders do. Each has an account so the books say who recorded what.',
    permissions: ALL,
  },
  systemRoles: [
    {
      key: 'finance.overseer',
      name: 'Finance overseer',
      description:
        "For administrators: Finance's summary under Departments, in numbers, with pledge totals and progress but no names (D41). Nothing in the Finance portal itself.",
      permissions: ['finance.summary.read'],
    },
    {
      key: 'finance.pastor_overseer',
      name: 'Finance overseer (pastors)',
      description:
        "For the pastors: Finance's summary, and who pledged what (D41). Nothing in the Finance portal itself.",
      permissions: ['finance.summary.read', 'finance.pledges.read_sensitive'],
    },
  ],
  nav: [
    { label: 'Overview', href: '/finance', icon: 'overview', permission: 'finance.overview.read' },
    {
      label: 'Transactions',
      href: '/finance/transactions',
      icon: 'transactions',
      permission: 'finance.transactions.read',
    },
    {
      label: 'Accounts',
      href: '/finance/accounts',
      icon: 'accounts',
      permission: 'finance.accounts.read',
    },
    {
      label: 'Budgets',
      href: '/finance/budgets',
      icon: 'budgets',
      permission: 'finance.budgets.read',
    },
    {
      label: 'Categories',
      href: '/finance/lists',
      icon: 'lists',
      permission: 'finance.catalog.read',
    },
    {
      label: 'Requests',
      href: '/finance/requests',
      icon: 'requests',
      permission: 'finance.transactions.read',
    },
    {
      label: 'Pledges',
      href: '/finance/pledges',
      icon: 'pledges',
      permission: 'finance.pledges.read',
    },
    {
      label: 'Reports',
      href: '/finance/reports',
      icon: 'reports',
      permission: 'finance.reports.read',
    },
  ],
});

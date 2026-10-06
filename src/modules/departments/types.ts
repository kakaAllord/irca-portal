import type { BudgetLine } from '@/shared';
import type { Stage } from '../membership/types';

/** What the departments API sends, as the portal reads it (D28). */

export type Portal = { key: string; name: string; enabled: boolean };

export type DepartmentRow = {
  id: string;
  name: string;
  description: string;
  portal: Portal | null;
  archived: boolean;
  leaders: { id: string; name: string; title: string }[];
  memberCount: number;
};

export type MyDepartment = {
  id: string;
  name: string;
  description: string;
  title: string;
  memberCount: number;
};

export type Leader = {
  id: string;
  personId: string;
  name: string;
  /** The name of their position: Chairperson, Secretary. */
  title: string;
  positionId: string;
  /** The whole number, only for those who oversee (pastors and administrators). */
  phone?: string;
  since: string;
  /** Only an administrator is told. */
  account: { status: 'ACTIVE' | 'INVITED' | 'DISABLED' } | null;
} & ViewAs;

/** Whether the person looking may view as them, decided by the API (12.8), never guessed here. */
export type ViewAs = { userId: string | null; canViewAs: boolean };

export type Member = {
  id: string;
  personId: string;
  name: string;
  stage: Stage;
  phoneTail: string;
  /** The whole number, only for those who oversee (pastors and administrators). */
  phone?: string;
  since: string;
  /** Only an administrator is told. */
  account?: { status: 'ACTIVE' | 'INVITED' | 'DISABLED' } | null;
} & ViewAs;

/** How an account stands, in words. */
export const ACCOUNT_STATUS = {
  ACTIVE: 'can sign in',
  INVITED: 'invited, not signed in yet',
  DISABLED: 'access disabled',
} as const;

/** A leadership position, from the list administrators keep. */
export type Position = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  /** Leaders holding it now. */
  holders: number;
};

export type DepartmentDetail = {
  id: string;
  name: string;
  description: string;
  portal: Portal | null;
  archived: boolean;
  /** Whether the person looking leads it; the pastors and administrators may only oversee it. */
  youLead: boolean;
  leaders: Leader[];
  members: Member[];
};

export type MemberCandidate = {
  personId: string;
  name: string;
  stage: Stage;
  phoneTail: string;
  /** For a department with a portal, where adding them gives a login (D31). */
  emailOnRecord?: boolean;
  account?: { email: string; status: 'ACTIVE' | 'INVITED' | 'DISABLED' } | null;
};

export type LeaderCandidate = {
  personId: string;
  name: string;
  phoneTail: string;
  emailOnRecord: boolean;
  account: { email: string; status: 'ACTIVE' | 'INVITED' | 'DISABLED' } | null;
};

export const since = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A department's numbers for those who oversee it (GET /departments/:id/summary). */
export type SummaryPeriod = 'this_month' | 'last_month' | 'this_year';
/** A number, and the same number for the period before. Money comes as a string. */
export type SummaryTile = { value: number | string; previous: number | string };
type Count = { value: number; previous: number };
type Money = { value: string; previous: string };

export type DepartmentSummary = {
  department: { id: string; name: string; portal: string | null };
  period: { key: SummaryPeriod; from: string; to: string };
  people: { leaders: number; members: number; joined: Count };
  messages: { messages: Count; texts: Count; cost: Money };
  /** This month's budget, when Finance set one (D40). */
  budget: null | {
    month: string;
    allocated: string;
    used: string;
    remaining: string;
    over: boolean;
    near: boolean;
  };
  finance: null | {
    income: Money;
    /** Income from the sources Finance counts as offerings. */
    offerings: Money;
    expenses: Money;
    net: Money;
    incomeBySource: { name: string; total: string }[];
    expensesByItem: { name: string; total: string }[];
    pledgeCampaigns: {
      id: string;
      name: string;
      target: string | null;
      pledged: string;
      paid: string;
      remaining: string;
      people: number;
    }[];
    /** Whether the person looking may open a campaign's names: the pastors (D41). */
    pledgeNames: boolean;
    /** What each account holds today, in its own currency (D39). */
    accounts: {
      id: string;
      name: string;
      method: string;
      currency: string;
      balance: string | null;
    }[];
    /** Every department with a budget this month. */
    budgets: { month: string; lines: BudgetLine[] };
  };
  comms: null | {
    messages: Count;
    texts: Count;
    cost: Money;
    failed: Count;
    optedOut: Count;
    credit: number | null;
    templatesWaiting: { inComms: number; withAdministrators: number };
    recurring: number;
  };
  outreach: null | {
    goDays: Count;
    reached: Count;
    saved: Count;
    followedUp: Count;
    awaiting: number;
    training: { attended: number; of: number };
    nextGoDay: { id: string; on: string; title: string } | null;
  };
};

import { z } from 'zod';

/**
 * Department budgets (D40; docs/plan/15, step 15.6): what each department may
 * spend in a month, in the church's currency. Used is worked out by the API
 * from the expenses tagged with the department; going over warns and never
 * refuses.
 */

/** An allocation may be zero: "nothing this month" is a decision too. */
const BudgetAmount = z
  .string()
  .trim()
  .transform((s) => s.replace(/,/g, ''))
  .pipe(z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter an amount like 300000'));

export const SetBudgetSchema = z.object({
  amount: BudgetAmount,
  /** Asked when an allocation already set is changed. */
  reason: z.string().trim().max(300).optional(),
});
export type SetBudgetInput = z.infer<typeof SetBudgetSchema>;

export type BudgetLine = {
  department: { id: string; name: string };
  /** Null when nothing is allocated for this month. */
  allocated: string | null;
  used: string;
  /** Allocated less used; below zero is over. Null with no allocation. */
  remaining: string | null;
  over: boolean;
  /** Used is at least 90% of the allocation, and not over. */
  near: boolean;
  /** Who last set it, and when. */
  setBy: string | null;
  setAt: string | null;
};

export type BudgetMonth = {
  month: string;
  lines: BudgetLine[];
  totals: { allocated: string; used: string };
  /** Departments with nothing allocated this month and something last month. */
  copyable: number;
};

/** What the expense form shows once a department is chosen. */
export type BudgetUsage = {
  department: { id: string; name: string };
  month: string;
  allocated: string | null;
  used: string;
};

'use client';

import { useEffect, useId, useState } from 'react';
import { formatMoney, type BudgetMonth } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { cn } from '@/lib/cn';

/**
 * Which department an expense was for, if any, and what that does to its
 * budget this month. Going over is a warning, never a refusal (D40): the
 * entry saves either way.
 */
export function DepartmentField({
  value,
  onChange,
  date,
  amount,
  currency,
  showBudget,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  /** The entry's date: the budget is the one for its month. */
  date: string;
  /** What is being typed, in the church's currency, to warn before it is saved. */
  amount: number;
  currency: string;
  /** Off in a correction, where the entry already counts in what is used. */
  showBudget: boolean;
  error?: string;
}) {
  const id = useId();
  const month = date.slice(0, 7);
  const [budgets, setBudgets] = useState<BudgetMonth | null>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    let live = true;
    clientApi<BudgetMonth>(`/finance/budgets?month=${month}`)
      .then((data) => live && setBudgets(data))
      .catch(() => live && setBudgets(null));
    return () => {
      live = false;
    };
  }, [month]);

  const line = budgets?.lines.find((l) => l.department.id === value);
  const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });
  // For the warning only; the books add up in Postgres.
  const cents = (s: string | null) => Math.round(Number(s ?? 0) * 100);
  const after = line ? cents(line.used) + Math.round(amount * 100) : 0;
  const overBy = line?.allocated != null ? after - cents(line.allocated) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-fg2">
        Department
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 rounded-[7px] border bg-input px-2.5 text-[12.5px] text-fg',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-br',
          error ? 'border-danger-br' : 'border-border',
        )}
      >
        <option value="">None: the church as a whole</option>
        {(budgets?.lines ?? []).map((l) => (
          <option key={l.department.id} value={l.department.id}>
            {l.department.name}
          </option>
        ))}
      </select>
      {error && <p className="text-[11.5px] text-danger">{error}</p>}
      {showBudget && line && (
        <p className="text-[12px] text-fg2" aria-live="polite">
          {line.allocated === null
            ? `${line.department.name} has no budget for ${monthName}.`
            : `${line.department.name}: ${formatMoney(line.used, '')} of ${formatMoney(line.allocated, '')} used this month.`}
        </p>
      )}
      {showBudget && line && line.allocated !== null && amount > 0 && overBy > 0 && (
        <p
          role="status"
          className="rounded-[8px] border border-warn-br bg-warn-bg px-3 py-2 text-[12px] text-warn-fg"
        >
          This takes the {line.department.name} {formatMoney((overBy / 100).toFixed(2), currency)}{' '}
          over its budget for {monthName}. It still saves.
        </p>
      )}
    </div>
  );
}

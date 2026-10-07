'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, type BudgetLine } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';

/** Setting a department's allocation for the month, or changing it with a reason. */
export function SetBudget({
  line,
  month,
  monthName,
  currency,
  compact = false,
}: {
  line: BudgetLine;
  month: string;
  monthName: string;
  currency: string;
  /** A small round button, inside a chip. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(line.allocated ? String(Number(line.allocated)) : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const changing = line.allocated !== null;

  async function save() {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await clientApi(`/finance/budgets/${month}/${line.department.id}`, {
        method: 'PUT',
        body: { amount, reason: reason || undefined },
      });
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        if (Object.keys(err.fieldErrors).length === 0) setError(err.message);
      } else setError('Something went wrong. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Can permission="finance.budgets.manage">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] font-medium text-fg hover:bg-hover"
        >
          Set budget
        </button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {changing ? 'Change budget' : 'Set budget'}
        </Button>
      )}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={`${line.department.name}, ${monthName}`}
        description={
          changing
            ? `Now ${formatMoney(line.allocated!, currency)}, with ${formatMoney(line.used, currency)} used. Every change is kept, with its reason.`
            : `${formatMoney(line.used, currency)} used so far this month.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={
                [
                  !amount.trim() && 'Amount',
                  changing && reason.trim().length < 3 && 'Why it changes',
                ].filter(Boolean) as string[]
              }
              onClick={() => void save()}
            >
              Save
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label={`Budget for ${monthName} (${currency})`}
            required
            inputMode="decimal"
            value={amount}
            error={errors.amount?.[0]}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
          />
          {changing && (
            <Input
              label="Why it changes"
              required
              placeholder="The choir trip was moved to November"
              value={reason}
              error={errors.reason?.[0]}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </div>
      </Drawer>
    </Can>
  );
}

export function CopyLastMonth({ month, count }: { month: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Can permission="finance.budgets.manage">
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await clientApi(`/finance/budgets/${month}/copy-last-month`, { method: 'POST' });
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        Copy last month ({count})
      </Button>
    </Can>
  );
}

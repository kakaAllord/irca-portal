'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatMoney, type FinanceTransaction } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { lastAccount, useAccounts } from './AccountSelect';
import { TransferFields, type TransferValues } from './TransferFields';

/**
 * Moving money between two of the church's accounts: the offering banked on
 * Monday, M-PESA drawn down to cash. It is recorded like any entry, with its
 * own number, and like any entry it is corrected only by request.
 */
export function TransferDrawer({ onClose, timezone }: { onClose: () => void; timezone: string }) {
  const router = useRouter();
  const accounts = useAccounts();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  const [values, setValues] = useState<TransferValues>({
    txnDate: today,
    accountId: '',
    toAccountId: '',
    amount: '',
    toAmount: '',
    reference: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<FinanceTransaction | null>(null);
  const requestId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (accounts && !values.accountId) {
      setValues((previous) => ({ ...previous, accountId: lastAccount(accounts.options) }));
    }
  }, [accounts, values.accountId]);

  async function save() {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const entry = await clientApi<FinanceTransaction>('/finance/transactions/transfers', {
        method: 'POST',
        body: {
          txnDate: values.txnDate,
          accountId: values.accountId,
          toAccountId: values.toAccountId,
          amount: values.amount,
          toAmount: values.toAmount || undefined,
          rate: values.rate || undefined,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
          clientRequestId: requestId.current,
        },
      });
      setSaved(entry);
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

  if (saved) {
    return (
      <Drawer
        open
        onClose={onClose}
        title="Move money between accounts"
        footer={
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="rounded-[12px] border border-pos-br bg-pos-bg p-5">
          <p className="text-[14px] font-semibold text-pos">✓ Saved as {saved.code}</p>
          <p className="mt-1 text-[12.5px] text-fg2">
            {formatMoney(saved.amount, saved.currency)} from {saved.account.name} to{' '}
            {saved.toAccount?.name}
          </p>
          <Link
            href={`/finance/transactions/${saved.code}`}
            className="mt-4 inline-flex h-9 items-center rounded-[7px] border border-border px-3.5 text-[12.5px] font-medium text-fg hover:bg-hover"
          >
            View entry
          </Link>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Move money between accounts"
      description="Banking the offering, or drawing M-PESA down to cash. It counts as neither income nor an expense."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton
            loading={busy}
            missing={
              [
                !values.accountId && 'From',
                (!values.toAccountId || values.toAccountId === values.accountId) && 'To',
                !values.amount.trim() && 'Amount',
              ].filter(Boolean) as string[]
            }
            onClick={() => void save()}
          >
            Save transfer
          </SubmitButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <TransferFields values={values} onChange={setValues} errors={errors} accounts={accounts} />
      </div>
    </Drawer>
  );
}

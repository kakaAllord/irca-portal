'use client';

import Link from 'next/link';
import { formatMoney } from '@/shared';
import { Input } from '@/components/ui/Input';
import { CatalogCombobox, type CatalogValue } from './CatalogCombobox';
import { AccountSelect, type Accounts } from './AccountSelect';
import { DepartmentField } from './DepartmentField';

export type EntryValues = {
  txnDate: string;
  item: CatalogValue;
  amount: string;
  accountId: string;
  /** Only for an account in another currency; empty means the latest rate. */
  rate: string;
  /** Expenses only: the department whose budget it uses; '' for none. */
  departmentId: string;
  reference: string;
  counterparty: string;
  notes: string;
};

/**
 * The fields of an entry, shared by recording one and by asking for one to be
 * corrected, so the two forms can never drift apart.
 */
export function EntryFields({
  kind,
  values,
  onChange,
  errors,
  accounts,
  showBudget = true,
}: {
  kind: 'income' | 'expense';
  values: EntryValues;
  /**
   * Takes an updater, not a value: creating an item answers from the network,
   * and by then the amount may already have been typed. Merging into whatever
   * is current is what stops that answer from wiping it.
   */
  onChange: (update: (previous: EntryValues) => EntryValues) => void;
  errors: Record<string, string[] | undefined>;
  accounts: Accounts | null;
  /** Off in a correction, where the entry already counts in what is used. */
  showBudget?: boolean;
}) {
  const set = <K extends keyof EntryValues>(key: K, value: EntryValues[K]) =>
    onChange((previous) => ({ ...previous, [key]: value }));
  const account = accounts?.options.find((o) => o.id === values.accountId);
  const currency = account?.currency ?? accounts?.baseCurrency ?? '';
  const base = accounts?.baseCurrency ?? '';
  const foreign = Boolean(account && account.currency !== base);
  const latest = account ? accounts?.rates[account.currency] : undefined;
  const rate = Number((values.rate || latest?.rate || '').replace(/,/g, ''));
  const amount = Number(values.amount.replace(/,/g, ''));
  const equivalent =
    foreign && rate > 0 && amount > 0 ? formatMoney((amount * rate).toFixed(2), base) : null;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Date"
        required
        type="date"
        value={values.txnDate}
        max={new Date().toISOString().slice(0, 10)}
        error={errors.txnDate?.[0]}
        onChange={(e) => set('txnDate', e.target.value)}
      />

      <CatalogCombobox
        kind={kind}
        value={values.item}
        onChange={(item) => set('item', item)}
        error={errors.item?.[0] ?? errors.incomeSourceId?.[0] ?? errors.expenseItemId?.[0]}
      />

      <AccountSelect
        label={kind === 'income' ? 'Received into' : 'Paid from'}
        value={values.accountId}
        onChange={(id) => set('accountId', id)}
        accounts={accounts}
        error={errors.accountId?.[0]}
      />

      <Input
        label={`Amount (${currency})`}
        required
        inputMode="decimal"
        value={values.amount}
        error={errors.amount?.[0]}
        onChange={(e) => set('amount', e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={(e) => set('amount', tidyAmount(e.target.value))}
      />

      {foreign && account && (
        <div className="flex flex-col gap-1.5 rounded-[10px] border border-border2 bg-surface2 p-3">
          {latest || values.rate ? (
            <>
              <Input
                label={`Rate: ${base} for 1 ${account.currency}`}
                required
                inputMode="decimal"
                hint={
                  latest
                    ? `Finance's latest rate is ${formatMoney(latest.rate, '')}. Change it only if this money was changed at another.`
                    : undefined
                }
                placeholder={latest ? formatMoney(latest.rate, '') : ''}
                value={values.rate}
                error={errors.rate?.[0]}
                onChange={(e) => set('rate', e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <p className="text-[12.5px] text-fg2" aria-live="polite">
                {equivalent ? (
                  <>
                    That is <span className="font-semibold text-fg">{equivalent}</span>.
                  </>
                ) : (
                  `The ${base} amount shows once the amount is typed.`
                )}
              </p>
            </>
          ) : (
            <p className="text-[12.5px] text-warn-fg">
              Set a rate for {account.currency} first, in{' '}
              <Link href="/finance/accounts#rates" className="underline">
                Accounts
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {kind === 'expense' && (
        <DepartmentField
          value={values.departmentId}
          onChange={(id) => set('departmentId', id)}
          date={values.txnDate}
          amount={foreign ? amount * rate || 0 : amount || 0}
          currency={base}
          showBudget={showBudget}
          error={errors.departmentId?.[0]}
        />
      )}

      <Input
        label="Reference"
        hint="Optional. M-Pesa code, receipt or cheque number."
        value={values.reference}
        error={errors.reference?.[0]}
        onChange={(e) => set('reference', e.target.value)}
      />
      <Input
        label={kind === 'income' ? 'Received from' : 'Paid to'}
        hint="Optional."
        value={values.counterparty}
        error={errors.counterparty?.[0]}
        onChange={(e) => set('counterparty', e.target.value)}
      />
      <Input
        label="Notes"
        hint="Optional."
        value={values.notes}
        error={errors.notes?.[0]}
        onChange={(e) => set('notes', e.target.value)}
      />
    </div>
  );
}

/** 150000 typed, "150,000" shown, once the field is left. */
function tidyAmount(value: string): string {
  const plain = value.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return value;
  const [whole, cents] = plain.split('.');
  return Number(whole).toLocaleString('en-GB') + (cents ? `.${cents}` : '');
}

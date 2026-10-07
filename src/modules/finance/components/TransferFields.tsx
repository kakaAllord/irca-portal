'use client';

import { formatMoney } from '@/shared';
import { Input } from '@/components/ui/Input';
import { AccountSelect, type Accounts } from './AccountSelect';

export type TransferValues = {
  txnDate: string;
  accountId: string;
  toAccountId: string;
  amount: string;
  /** Only when the two accounts are in different currencies. */
  toAmount: string;
  /**
   * Only when money leaves another currency for anything but the church's
   * own; into the church's own, what arrived says the rate.
   */
  rate?: string;
  reference: string;
  notes: string;
};

/**
 * The fields of a transfer, shared by recording one and asking for one to be
 * corrected. What arrived is asked for only between two currencies; between
 * two shilling accounts it is simply what left.
 */
export function TransferFields({
  values,
  onChange,
  errors,
  accounts,
}: {
  values: TransferValues;
  onChange: (update: (previous: TransferValues) => TransferValues) => void;
  errors: Record<string, string[] | undefined>;
  accounts: Accounts | null;
}) {
  const set = <K extends keyof TransferValues>(key: K, value: TransferValues[K]) =>
    onChange((previous) => ({ ...previous, [key]: value }));
  const from = accounts?.options.find((o) => o.id === values.accountId);
  const to = accounts?.options.find((o) => o.id === values.toAccountId);
  const twoCurrencies = Boolean(from && to && from.currency !== to.currency);
  const same = values.accountId && values.accountId === values.toAccountId;
  const base = accounts?.baseCurrency ?? '';
  const fromForeign = Boolean(from && base && from.currency !== base);
  const latest = from ? accounts?.rates[from.currency] : undefined;
  const left = Number(values.amount.replace(/,/g, ''));
  const arrived = Number(values.toAmount.replace(/,/g, ''));
  // Changed into the church's own currency: what arrived for each unit is the rate.
  const implied =
    fromForeign && to?.currency === base && left > 0 && arrived > 0
      ? (arrived / left).toFixed(2)
      : null;

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
      <AccountSelect
        label="From"
        value={values.accountId}
        onChange={(id) => set('accountId', id)}
        accounts={accounts}
        error={errors.accountId?.[0]}
      />
      <AccountSelect
        label="To"
        value={values.toAccountId}
        onChange={(id) => set('toAccountId', id)}
        accounts={accounts}
        error={errors.toAccountId?.[0] ?? (same ? 'Choose two different accounts' : undefined)}
      />
      <Input
        label={`Amount that left${from ? ` (${from.currency})` : ''}`}
        required
        inputMode="decimal"
        value={values.amount}
        error={errors.amount?.[0]}
        onChange={(e) => set('amount', e.target.value.replace(/[^\d.,]/g, ''))}
      />
      {twoCurrencies && to && (
        <Input
          label={`Amount that arrived (${to.currency})`}
          required
          inputMode="decimal"
          hint="From the bank slip or the receipt for the exchange."
          value={values.toAmount}
          error={errors.toAmount?.[0]}
          onChange={(e) => set('toAmount', e.target.value.replace(/[^\d.,]/g, ''))}
        />
      )}
      {implied && from && (
        <p className="text-[12.5px] text-fg2" aria-live="polite">
          That is 1 {from.currency} = {formatMoney(implied, base)}, the rate kept with this entry.
          {!latest && ` It becomes Finance's rate for ${from.currency} too.`}
        </p>
      )}
      {fromForeign && from && to && to.currency !== base && (
        <Input
          label={`Rate: ${base} for 1 ${from.currency}`}
          required={!latest}
          inputMode="decimal"
          hint={
            latest
              ? `Optional. Finance's latest rate, ${formatMoney(latest.rate, '')}, is used when left empty.`
              : `No rate for ${from.currency} yet. Type what 1 ${from.currency} is worth; it becomes Finance's rate from now on.`
          }
          placeholder={latest ? formatMoney(latest.rate, '') : ''}
          value={values.rate ?? ''}
          error={errors.rate?.[0]}
          onChange={(e) => set('rate', e.target.value.replace(/[^\d.,]/g, ''))}
        />
      )}
      {from && to && !twoCurrencies && Number(values.amount.replace(/,/g, '')) > 0 && (
        <p className="text-[12.5px] text-fg2">
          {from.name} goes down and {to.name} goes up by{' '}
          {formatMoney(values.amount.replace(/,/g, ''), from.currency)}. Neither is income nor an
          expense.
        </p>
      )}
      <Input
        label="Reference"
        hint="Optional. The bank slip or M-Pesa code."
        value={values.reference}
        error={errors.reference?.[0]}
        onChange={(e) => set('reference', e.target.value)}
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

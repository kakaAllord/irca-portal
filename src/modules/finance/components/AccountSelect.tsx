'use client';

import { useEffect, useId, useState } from 'react';
import { accountOptions, type AccountOption, type AccountsResponse } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { cn } from '@/lib/cn';

const LAST = 'irca.finance.lastAccount';

export type Accounts = {
  options: AccountOption[];
  baseCurrency: string;
  /** Some account is in another currency, so currency is worth showing (D38). */
  foreign: boolean;
  /** The latest rate for each foreign currency, when Finance has set one. */
  rates: AccountsResponse['rates'];
};

/**
 * The accounts a form may record into, fetched once when the form opens.
 * Every form that names an account asks for it the same way, so a turned-off
 * account disappears from all of them at once.
 */
export function useAccounts(): Accounts | null {
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  useEffect(() => {
    let live = true;
    clientApi<AccountsResponse>('/finance/accounts')
      .then((data) => {
        if (live) {
          setAccounts({
            options: accountOptions(data),
            baseCurrency: data.baseCurrency,
            foreign: data.foreign,
            rates: data.rates,
          });
        }
      })
      .catch(
        () => live && setAccounts({ options: [], baseCurrency: 'TZS', foreign: false, rates: {} }),
      );
    return () => {
      live = false;
    };
  }, []);
  return accounts;
}

/** The account this person recorded into last, on this device, if it is still offered. */
export function lastAccount(options: AccountOption[]): string {
  let last: string | null = null;
  try {
    last = window.localStorage.getItem(LAST);
  } catch {
    // Private windows and blocked storage just start from the first account.
  }
  return options.find((o) => o.id === last)?.id ?? options[0]?.id ?? '';
}

export function rememberAccount(id: string): void {
  try {
    window.localStorage.setItem(LAST, id);
  } catch {
    // Remembering is a convenience; nothing depends on it.
  }
}

/** Accounts grouped under their payment methods, as Finance → Accounts lists them. */
export function AccountSelect({
  label,
  value,
  onChange,
  accounts,
  error,
  only,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  accounts: Accounts | null;
  error?: string;
  /** Leaves out accounts this form cannot use, such as a foreign one for a pledge. */
  only?: (option: AccountOption) => boolean;
}) {
  const id = useId();
  const options = (accounts?.options ?? []).filter((o) => !only || only(o));
  const groups = [...new Map(options.map((o) => [o.method.id, o.method.name])).entries()];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-fg2">
        {label}
        <RequiredMark />
      </label>
      <select
        id={id}
        required
        aria-required
        aria-invalid={error ? true : undefined}
        value={value}
        disabled={!accounts}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 rounded-[7px] border bg-input px-2.5 text-[12.5px] text-fg',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-br',
          error ? 'border-danger-br' : 'border-border',
        )}
      >
        {!accounts && <option value="">Loading accounts…</option>}
        {accounts && options.length === 0 && <option value="">No account is turned on</option>}
        {groups.map(([methodId, methodName]) => (
          <optgroup key={methodId} label={methodName}>
            {options
              .filter((o) => o.method.id === methodId)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {accounts?.foreign ? ` · ${o.currency}` : ''}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      {error && <p className="text-[11.5px] text-danger">{error}</p>}
      {accounts && options.length === 0 && (
        <p className="text-[11.5px] text-fg3">
          Someone in Finance can add or turn one on in Accounts.
        </p>
      )}
    </div>
  );
}

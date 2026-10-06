import type { Metadata } from 'next';
import {
  formatMoney,
  type AccountsResponse,
  type ExchangeRateView,
  type MeResponse,
} from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
import {
  AccountActions,
  MethodActions,
  NewAccountButton,
  NewMethodButton,
  SetRateButton,
} from './AccountActions';

export const metadata: Metadata = { title: 'Accounts' };

/**
 * Where the church's money is held, grouped by how it moves.
 *
 * Nothing that has been used is deleted here: an account with entries is
 * turned off, and stops being offered, so its entries keep their meaning.
 * Balances are worked out from the opening balance and the entries every
 * time the page is opened.
 */
export default async function AccountsPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.accounts.read')) return <ForbiddenState what="the finance accounts" />;

  const data = await serverApi<AccountsResponse>('/finance/accounts');
  // Rates matter only once some account is in another currency (D38).
  const history = data.foreign
    ? await serverApi<ExchangeRateView[]>('/finance/exchange-rates')
    : [];
  const foreignCurrencies = [
    ...new Set(
      data.methods
        .flatMap((m) => m.accounts)
        .filter((a) => a.isActive && a.currency !== data.baseCurrency)
        .map((a) => a.currency),
    ),
  ].sort();
  const methods = data.methods.map((m) => ({ id: m.id, name: m.name, isActive: m.isActive }));

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Payment methods, the accounts under each, and what every account holds."
        actions={
          <>
            <NewMethodButton />
            <NewAccountButton methods={methods} baseCurrency={data.baseCurrency} />
          </>
        }
      />

      {data.methods.length === 0 ? (
        <EmptyState title="No payment methods yet">
          Add one, such as Cash or Mobile money, then its accounts.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {data.methods.map((method) => (
            <section
              key={method.id}
              className="rounded-[10px] border border-border bg-surface"
              aria-labelledby={`method-${method.id}`}
            >
              <header className="flex flex-wrap items-center gap-2 border-b border-border2 px-4 py-2.5">
                <h2
                  id={`method-${method.id}`}
                  className={`text-[13px] font-semibold ${method.isActive ? 'text-fg' : 'text-fg3'}`}
                >
                  {method.name}
                </h2>
                {!method.isActive && <Badge tone="muted">Off</Badge>}
                <span className="ml-auto">
                  <MethodActions method={method} />
                </span>
              </header>

              {method.accounts.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] text-fg3">No accounts under {method.name}.</p>
              ) : (
                <ul className="divide-y divide-border2">
                  {method.accounts.map((account) => {
                    const negative = account.balance !== null && Number(account.balance) < 0;
                    return (
                      <li
                        key={account.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3"
                      >
                        <div className="min-w-[180px] flex-1">
                          <p className="flex items-center gap-2 text-[13px]">
                            <span
                              className={`font-medium ${account.isActive ? 'text-fg' : 'text-fg3'}`}
                            >
                              {account.name}
                            </span>
                            {data.foreign && <Badge tone="neutral">{account.currency}</Badge>}
                            {!account.isActive && <Badge tone="muted">Off</Badge>}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-fg3">
                            {[
                              account.number,
                              `Opened ${day(account.openingDate)} with ${formatMoney(account.openingBalance, account.currency)}`,
                              account.notes,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {account.openRequest && (
                            <p className="mt-1 text-[11.5px] text-warn-fg">
                              {account.openRequest.requestedBy} asked for a change — waiting for an
                              administrator.
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-[14px] font-semibold tabular-nums ${negative ? 'text-danger' : 'text-fg'}`}
                          >
                            {account.balance === null
                              ? '—'
                              : formatMoney(account.balance, account.currency)}
                          </p>
                          {negative && (
                            <p className="max-w-[240px] text-[11px] text-danger">
                              Check this account: it has paid out more than it had.
                            </p>
                          )}
                        </div>
                        <AccountActions account={account} methodActive={method.isActive} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {data.foreign && (
        <section id="rates" className="mt-6" aria-labelledby="rates-heading">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 id="rates-heading" className="text-[13px] font-semibold text-fg">
              Exchange rates
            </h2>
            <span className="ml-auto">
              <SetRateButton currencies={foreignCurrencies} baseCurrency={data.baseCurrency} />
            </span>
          </div>
          <p className="mb-3 text-[12.5px] text-fg2">
            What one unit of each currency is worth in {data.baseCurrency}. A new entry uses the
            latest rate unless another is typed for it; entries already recorded keep theirs.
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {foreignCurrencies.map((currency) => {
              const current = data.rates[currency];
              return (
                <div
                  key={currency}
                  className="rounded-[10px] border border-border bg-surface p-3.5"
                >
                  <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">
                    1 {currency}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold tabular-nums text-fg">
                    {current ? formatMoney(current.rate, data.baseCurrency) : 'No rate yet'}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-fg3">
                    {current ? `Since ${when(current.effectiveFrom)}` : 'Set one before recording.'}
                  </p>
                </div>
              );
            })}
          </div>
          {history.length > 0 && (
            <details className="rounded-[10px] border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-[12.5px] text-fg2">
                Every rate set ({history.length})
              </summary>
              <ul className="divide-y divide-border2 border-t border-border2">
                {history.map((rate) => (
                  <li key={rate.id} className="flex flex-wrap gap-x-3 px-4 py-2 text-[12.5px]">
                    <span className="tabular-nums text-fg">
                      1 {rate.currency} = {formatMoney(rate.rate, data.baseCurrency)}
                    </span>
                    <span className="text-fg3">
                      {when(rate.effectiveFrom)} · {rate.setBy}
                      {rate.note && ` · ${rate.note}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

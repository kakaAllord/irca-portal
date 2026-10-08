import type { Metadata } from 'next';
import Link from 'next/link';
import {
  formatMoney,
  type AccountsResponse,
  type ExchangeRateView,
  type FinanceAccountView,
  type PaymentMethod,
} from '@/shared';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
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
import { BankCard } from '@/modules/finance/components/BankCard';

export const metadata: Metadata = { title: 'Accounts' };

/**
 * Where the church's money is held, grouped by how it moves, each account
 * drawn as a card with what it holds. Above them, the total and what needs
 * someone's attention: an account overdrawn, a correction waiting, a
 * currency with no rate.
 *
 * Nothing that has been used is deleted here: an account with entries is
 * turned off, and stops being offered, so its entries keep their meaning.
 * Balances are worked out from the opening balance and the entries every
 * time the page is opened.
 */
export default async function AccountsPage() {
  const me = await getMe();
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
  const methods = data.methods.map((m) => ({
    id: m.id,
    name: m.name,
    isActive: m.isActive,
    kind: m.kind,
  }));
  const base = data.baseCurrency;
  const church = me.church?.code ?? 'Church';

  // What the church holds, in its own currency: foreign accounts at the
  // latest rate, so the figure is approximate once there are any.
  const inBase = (a: FinanceAccountView) => {
    if (a.balance === null) return 0;
    if (a.currency === base) return Number(a.balance);
    const rate = data.rates[a.currency];
    return rate ? Number(a.balance) * Number(rate.rate) : 0;
  };
  const using = data.methods.filter((m) => m.accounts.length > 0);
  const byMethod = using
    .map((m) => ({
      method: m,
      total: m.accounts.filter((a) => a.isActive).reduce((n, a) => n + inBase(a), 0),
    }))
    .filter((m) => m.total !== 0);
  const total = byMethod.reduce((n, m) => n + m.total, 0);
  const positive = byMethod.filter((m) => m.total > 0);
  const positiveTotal = positive.reduce((n, m) => n + m.total, 0);
  const overdrawn = data.methods.flatMap((m) =>
    m.accounts.filter((a) => a.isActive && a.balance !== null && Number(a.balance) < 0),
  );
  const waiting = data.methods.flatMap((m) => m.accounts.filter((a) => a.openRequest));
  const noRate = foreignCurrencies.filter((c) => !data.rates[c]);
  const accountCount = data.methods.reduce(
    (n, m) => n + m.accounts.filter((a) => a.isActive).length,
    0,
  );

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Where the church's money is kept, and how much each place holds right now."
        actions={
          <>
            <NewMethodButton />
            <NewAccountButton methods={methods} baseCurrency={base} />
          </>
        }
      />

      {data.methods.length === 0 ? (
        <EmptyState title="No payment methods yet">
          Add one, such as Cash or Mobile money, then its accounts.
        </EmptyState>
      ) : (
        <>
          <section
            aria-label="What the church holds"
            className="mb-6 grid gap-4 rounded-[18px] border border-border bg-surface p-5 lg:grid-cols-[1fr_1.2fr]"
          >
            <div className="flex flex-col justify-center gap-1">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-fg3 uppercase">
                Held across {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
              </p>
              <p className="text-[30px] leading-tight font-semibold tabular-nums text-fg">
                {data.foreign && '≈ '}
                {formatMoney(String(Math.round(total)), base)}
              </p>
              <p className="text-[12px] text-fg3">
                Worked out from every entry each time this page opens
                {data.foreign && `; other currencies at the latest rate to ${base}`}.
              </p>
            </div>
            {positive.length > 0 && (
              <div className="flex flex-col justify-center gap-3">
                <div
                  className="flex h-3 overflow-hidden rounded-full bg-chip"
                  role="img"
                  aria-label={positive
                    .map((m) => `${m.method.name} ${Math.round((m.total / positiveTotal) * 100)}%`)
                    .join(', ')}
                >
                  {positive.map((m) => (
                    <span
                      key={m.method.id}
                      style={{
                        width: `${(m.total / positiveTotal) * 100}%`,
                        background: SWATCH[m.method.kind],
                      }}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {byMethod.map((m) => (
                    <li key={m.method.id} className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5 text-[11.5px] text-fg3">
                        <span
                          aria-hidden="true"
                          className="size-2 flex-none rounded-full"
                          style={{ background: SWATCH[m.method.kind] }}
                        />
                        {m.method.name}
                      </span>
                      <span
                        className={`text-[13px] font-semibold tabular-nums ${m.total < 0 ? 'text-danger' : 'text-fg'}`}
                      >
                        {formatMoney(String(Math.round(m.total)), base)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {(overdrawn.length > 0 || waiting.length > 0 || noRate.length > 0) && (
            <section aria-label="Needs attention" className="mb-6 flex flex-col gap-2">
              {overdrawn.map((a) => (
                <Attention key={a.id} tone="danger">
                  <strong>{a.name}</strong> shows {formatMoney(a.balance!, a.currency)}: more went
                  out than came in.{' '}
                  <Link
                    href={`/finance/transactions?accountId=${a.id}`}
                    className="font-medium underline"
                  >
                    Check its entries
                  </Link>{' '}
                  for an income recorded elsewhere, or an expense paid from another account.
                </Attention>
              ))}
              {waiting.map((a) => (
                <Attention key={a.id} tone="warn">
                  {a.openRequest!.requestedBy} asked to correct <strong>{a.name}</strong>&apos;s
                  opening balance or currency.{' '}
                  <Link href="/finance/requests" className="font-medium underline">
                    It waits for an administrator
                  </Link>
                  .
                </Attention>
              ))}
              {noRate.map((c) => (
                <Attention key={c} tone="warn">
                  No exchange rate for {c} yet, so its accounts are left out of the total. The first
                  entry into one asks for it, or set it now under{' '}
                  <a href="#rates" className="font-medium underline">
                    Exchange rates
                  </a>
                  .
                </Attention>
              ))}
            </section>
          )}

          <div className="flex flex-col gap-8">
            {using.map((method) => (
              <section key={method.id} aria-labelledby={`method-${method.id}`}>
                <header className="mb-3 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: SWATCH[method.kind] }}
                  />
                  <h2
                    id={`method-${method.id}`}
                    className={`text-[14px] font-semibold ${method.isActive ? 'text-fg' : 'text-fg3'}`}
                  >
                    {method.name}
                  </h2>
                  <span className="text-[12px] text-fg3">
                    {method.accounts.length} {method.accounts.length === 1 ? 'account' : 'accounts'}
                  </span>
                  {!method.isActive && <Badge tone="muted">Not in use</Badge>}
                  <span className="ml-auto flex items-center gap-1">
                    {method.isActive && (
                      <NewAccountButton
                        methods={methods}
                        baseCurrency={base}
                        methodId={method.id}
                        inline
                      />
                    )}
                    <MethodActions method={method} />
                  </span>
                </header>
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {method.accounts.map((account) => (
                    <li key={account.id} className="flex flex-col gap-2">
                      <BankCard
                        account={account}
                        kind={method.kind}
                        methodName={method.name}
                        church={church}
                        showCurrency={data.foreign}
                        actions={
                          <AccountActions
                            account={account}
                            kind={method.kind}
                            methodActive={method.isActive}
                            onCard
                          />
                        }
                      />
                      <p className="px-1 text-[11.5px] text-fg3">
                        {[
                          `Opened ${day(account.openingDate)} with ${formatMoney(account.openingBalance, account.currency)}`,
                          account.notes,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {data.foreign && (
        <section id="rates" className="mt-10" aria-labelledby="rates-heading">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div>
              <h2 id="rates-heading" className="text-[14px] font-semibold text-fg">
                Exchange rates
              </h2>
              <p className="text-[12px] text-fg3">
                What one unit is worth in {base}. New entries use the latest rate; recorded ones
                keep theirs.
              </p>
            </div>
            <span className="ml-auto">
              <SetRateButton currencies={foreignCurrencies} baseCurrency={base} />
            </span>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {foreignCurrencies.map((currency) => {
              const current = data.rates[currency];
              return (
                <div
                  key={currency}
                  className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-4"
                >
                  <span className="flex size-10 flex-none items-center justify-center rounded-full bg-chip text-[12px] font-bold text-fg2">
                    {currency}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[16px] font-semibold tabular-nums text-fg">
                      {current ? formatMoney(current.rate, base) : 'No rate yet'}
                    </span>
                    <span className="text-[11.5px] text-fg3">
                      {current
                        ? `for 1 ${currency}, since ${when(current.effectiveFrom)}`
                        : 'The first entry asks for it, or set it here.'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {history.length > 0 && (
            <details className="rounded-[14px] border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-[12.5px] text-fg2">
                Every rate set ({history.length})
              </summary>
              <ul className="divide-y divide-border2 border-t border-border2">
                {history.map((rate) => (
                  <li key={rate.id} className="flex flex-wrap gap-x-3 px-4 py-2 text-[12.5px]">
                    <span className="tabular-nums text-fg">
                      1 {rate.currency} = {formatMoney(rate.rate, base)}
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

/** The colour each kind of method has on its cards, for the bar and the dots. */
const SWATCH: Record<PaymentMethod, string> = {
  CASH: '#1f7a5a',
  MOBILE_MONEY: '#d2552a',
  BANK_TRANSFER: '#2d58a8',
  CHEQUE: '#7a6a55',
  CARD: '#b8913f',
  OTHER: '#6f4bb8',
};

function Attention({ tone, children }: { tone: 'danger' | 'warn'; children: React.ReactNode }) {
  return (
    <p
      className={`rounded-[12px] border px-4 py-3 text-[12.5px] ${
        tone === 'danger'
          ? 'border-danger-br bg-danger-bg text-danger'
          : 'border-warn-br bg-warn-bg text-warn-fg'
      }`}
    >
      {children}
    </p>
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

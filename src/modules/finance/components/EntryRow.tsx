import Link from 'next/link';
import { formatMoney, type FinanceTransaction } from '@/shared';
import { cn } from '@/lib/cn';
import { entryWhat } from './entry';

const LOOK = {
  INCOME: {
    bubble: 'bg-pos-bg text-pos',
    path: 'M8 13V3M4 7l4-4 4 4',
    sign: '+',
    amount: 'text-pos',
  },
  EXPENSE: {
    bubble: 'bg-danger-bg text-danger',
    path: 'M8 3v10M4 9l4 4 4-4',
    sign: '−',
    amount: 'text-fg',
  },
  TRANSFER: {
    bubble: 'bg-chip text-fg2',
    path: 'M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13',
    sign: '',
    amount: 'text-fg2',
  },
} as const;

/**
 * One entry as a line in a statement: an arrow in for income, out for an
 * expense, across for a transfer; what it was for, who paid or was paid, the
 * account and its number; and the amount, green when it came in. A voided
 * entry is struck through and says so.
 */
export function EntryRow({
  entry,
  currency,
  showDate = false,
}: {
  entry: FinanceTransaction;
  /** The church's own currency: another is named beside the amount. */
  currency: string;
  showDate?: boolean;
}) {
  const look = LOOK[entry.kind];
  const voided = entry.status === 'VOIDED';
  const where = entry.toAccount
    ? `${entry.account.name} → ${entry.toAccount.name}`
    : entry.account.name;
  return (
    <li>
      <Link
        href={`/finance/transactions/${entry.code}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 flex-none items-center justify-center rounded-full',
            voided ? 'bg-chip text-fg3' : look.bubble,
          )}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
            <path d={look.path} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'flex items-center gap-2 truncate text-[13px] font-medium',
              voided ? 'text-fg3 line-through' : 'text-fg',
            )}
          >
            {entryWhat(entry)}
            {voided && (
              <span className="rounded-full bg-chip px-1.5 text-[10.5px] font-normal text-fg3 no-underline">
                Voided
              </span>
            )}
          </span>
          <span className="truncate text-[11.5px] text-fg3">
            {[entry.counterparty, where, entry.department?.name, showDate && day(entry.txnDate)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end">
          <span
            className={cn(
              'text-[13.5px] font-semibold tabular-nums',
              voided ? 'text-fg3 line-through' : look.amount,
            )}
          >
            {look.sign}
            {formatMoney(entry.amount, entry.currency === currency ? '' : entry.currency)}
          </span>
          <span className="font-mono text-[10.5px] text-fg3">
            {entry.currency !== currency
              ? formatMoney(entry.baseAmount, currency)
              : entry.code.split('-').slice(-2).join('-')}
          </span>
        </span>
      </Link>
    </li>
  );
}

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

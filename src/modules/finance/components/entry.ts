import type { FinanceTransaction } from '@/shared';

/** + for money in, − for money out, ⇄ for money moved between accounts. */
export const entrySign = (entry: Pick<FinanceTransaction, 'kind'>) =>
  ({ INCOME: '+', EXPENSE: '−', TRANSFER: '⇄ ' })[entry.kind];

/** What an entry is about: its source or item, or where a transfer went. */
export const entryWhat = (entry: FinanceTransaction) =>
  entry.kind === 'TRANSFER'
    ? `Transfer to ${entry.toAccount?.name ?? 'another account'}`
    : (entry.item?.name ?? '');

export const KIND_NAME = { INCOME: 'Income', EXPENSE: 'Expense', TRANSFER: 'Transfer' } as const;

import { z } from 'zod';

/**
 * Amounts are strings everywhere outside SQL.
 *
 * A double is not money: 0.1 + 0.2 is not 0.3, and a church's books must add
 * up. Totals come from sum() in Postgres, which uses numeric, and travel as
 * strings. Nothing in TypeScript ever adds two amounts.
 */
export const AmountSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/,/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter an amount like 150000 or 150000.50')
      .refine((s) => Number(s) > 0, 'The amount must be more than zero'),
  );

/** 150000 → "150,000"; "150000.5" → "150,000.50". For display only. */
export function formatMoney(amount: string | number, currency = 'TZS'): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const hasCents = !Number.isInteger(n);
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

/** The same, without the currency: for table cells where the column says it. */
export const formatAmount = (amount: string | number) => formatMoney(amount, '');

/**
 * An exchange rate: the church's currency for one unit of another, as typed.
 * Up to six decimals, because 1 TZS in USD is 0.000377.
 */
export const RateSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/,/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\d{1,12}(\.\d{1,6})?$/, 'Enter a rate like 2650 or 2650.50')
      .refine((s) => Number(s) > 0, 'The rate must be more than zero'),
  );

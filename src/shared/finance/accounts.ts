import { z } from 'zod';
import { tidyName } from './names';
import { RateSchema } from './money';
import { PaymentMethodSchema, type PaymentMethod } from './schemas';

/**
 * Payment methods and accounts (D38, D39; docs/plan/15): the lists Finance
 * keeps of how money moves and where it is held. An account's balance is
 * never stored; the API works it out every time.
 */

const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Choose a real date');

const ListName = z
  .string()
  .transform(tidyName)
  .pipe(z.string().min(2, 'Use at least 2 characters').max(60, 'Use at most 60 characters'));

export const CurrencySchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter code, like TZS or USD'));

/**
 * An opening balance may be zero, and may be below zero for an overdrawn
 * account, which is why this is not AmountSchema.
 */
export const BalanceSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/,/g, ''))
  .pipe(z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/, 'Enter an amount like 150000 or 150000.50'));

export const CreatePaymentMethodSchema = z.object({
  name: ListName,
  /** What reports group it with. Defaults to Other. */
  kind: PaymentMethodSchema.optional(),
  confirmDistinct: z.boolean().optional(),
});
export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z
  .object({ name: ListName, confirmDistinct: z.boolean() })
  .partial()
  .refine((v) => v.name !== undefined, 'Change something');

/**
 * The four colour templates an account's card may be drawn in, chosen when
 * it is made and changeable after. An account without one is drawn in its
 * payment method's own colours.
 */
export const CARD_STYLES = ['FOREST', 'SUNSET', 'OCEAN', 'ONYX'] as const;
export const CardStyleSchema = z.enum(CARD_STYLES, 'Choose one of the four cards');
export type CardStyle = z.infer<typeof CardStyleSchema>;

export const CreateAccountSchema = z.object({
  methodId: z.uuid('Choose a payment method'),
  name: ListName,
  currency: CurrencySchema.optional(),
  number: z.string().trim().max(60).optional(),
  openingBalance: BalanceSchema.optional(),
  openingDate: DateSchema,
  notes: z.string().trim().max(300).optional(),
  cardStyle: CardStyleSchema.optional(),
  confirmDistinct: z.boolean().optional(),
});
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

/**
 * Name, number, notes and the card's colours change directly. Currency, opening balance and
 * opening date change directly only while the account has no entries; after
 * that they are a change request (D17).
 */
export const UpdateAccountSchema = z
  .object({
    name: ListName,
    number: z.string().trim().max(60),
    notes: z.string().trim().max(300),
    cardStyle: CardStyleSchema,
    currency: CurrencySchema,
    openingBalance: BalanceSchema,
    openingDate: DateSchema,
    confirmDistinct: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).some((k) => k !== 'confirmDistinct'), 'Change something');
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

/** What a request about an account with entries may propose. */
export const ProposedAccountSchema = z
  .object({
    currency: CurrencySchema,
    openingBalance: BalanceSchema,
    openingDate: DateSchema,
  })
  .partial();

export const AccountChangeRequestSchema = z.object({
  proposed: ProposedAccountSchema.refine((v) => Object.keys(v).length > 0, 'Change something'),
  reason: z
    .string()
    .trim()
    .min(5, 'Say what was wrong, in a few words')
    .max(500, 'Use at most 500 characters'),
});
export type AccountChangeRequestInput = z.infer<typeof AccountChangeRequestSchema>;

export type FinanceAccountView = {
  id: string;
  methodId: string;
  name: string;
  currency: string;
  number: string | null;
  openingBalance: string;
  openingDate: string;
  isActive: boolean;
  notes: string;
  /** Null: drawn in its method's own colours. */
  cardStyle: CardStyle | null;
  /** In the account's own currency; null before its opening date. */
  balance: string | null;
  /** Entries of any status that use it. A used account cannot be deleted. */
  uses: number;
  /** A change to its currency or opening balance waiting for an administrator. */
  openRequest: { id: string; requestedBy: string } | null;
};

export type PaymentMethodView = {
  id: string;
  name: string;
  kind: PaymentMethod;
  sortOrder: number;
  isActive: boolean;
  accounts: FinanceAccountView[];
};

/** Finance → Accounts, and what every form that names an account needs. */
export type AccountsResponse = {
  /** The church's own currency: rates are to it, and totals are in it. */
  baseCurrency: string;
  /** Some active account is in another currency, so currency is shown (D38). */
  foreign: boolean;
  methods: PaymentMethodView[];
  /** The latest rate for each foreign currency an account uses, if Finance set one. */
  rates: Record<string, { rate: string; effectiveFrom: string }>;
};

/** An account as a form's picker shows it: grouped by method, active only. */
export type AccountOption = {
  id: string;
  name: string;
  currency: string;
  method: { id: string; name: string; kind: PaymentMethod };
};

/** Every active account, grouped by method in its order, for a picker. */
export function accountOptions(data: AccountsResponse): AccountOption[] {
  return data.methods
    .filter((m) => m.isActive)
    .flatMap((m) =>
      m.accounts
        .filter((a) => a.isActive)
        .map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          method: { id: m.id, name: m.name, kind: m.kind },
        })),
    );
}

export const SetRateSchema = z.object({
  currency: CurrencySchema,
  rate: RateSchema,
  note: z.string().trim().max(200).optional(),
});
export type SetRateInput = z.infer<typeof SetRateSchema>;

export type ExchangeRateView = {
  id: string;
  currency: string;
  rate: string;
  effectiveFrom: string;
  setBy: string;
  note: string;
};

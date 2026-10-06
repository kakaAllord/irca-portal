'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { PAYMENT_METHODS, type FinanceAccountView, type PaymentMethod } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';

type Method = { id: string; name: string; isActive: boolean };
type Candidate = { id: string; name: string };

/**
 * Sends one change and refreshes the page. A name close to one that exists
 * comes back as candidates, once, so the drawer can ask "did you mean…"
 * before adding a second M-PESA.
 */
function useSend() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [similar, setSimilar] = useState<Candidate[] | null>(null);

  async function send(path: string, method: string, body?: object): Promise<boolean> {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await clientApi(path, { method, body });
      setSimilar(null);
      router.refresh();
      return true;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const details = err.details as { candidates?: Candidate[] } | undefined;
        if (err.code === 'SIMILAR_EXISTS' && details?.candidates) setSimilar(details.candidates);
        else {
          setFieldErrors(err.fieldErrors);
          setError(err.message);
        }
      } else setError('Something went wrong. Try again in a moment.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const reset = () => {
    setError(null);
    setFieldErrors({});
    setSimilar(null);
  };
  return { send, busy, error, fieldErrors, similar, reset };
}

function Similar({ similar, name }: { similar: Candidate[]; name: string }) {
  return (
    <Alert tone="warn">
      Did you mean {similar.map((c) => `“${c.name}”`).join(' or ')}? If “{name}” is something else,
      press the button again to add it anyway.
    </Alert>
  );
}

// ── Methods ─────────────────────────────────────────────────────────────

export function NewMethodButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PaymentMethod>('OTHER');
  const { send, busy, error, similar, reset } = useSend();

  const close = () => {
    setOpen(false);
    setName('');
    reset();
  };

  return (
    <Can permission="finance.accounts.manage">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Payment method
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title="Add a payment method"
        description="A way money moves, such as Mobile money or Bank. Accounts go under it."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={name.trim().length < 2 ? ['Name'] : []}
              onClick={async () => {
                const ok = await send('/finance/payment-methods', 'POST', {
                  name,
                  kind,
                  confirmDistinct: Boolean(similar),
                });
                if (ok) close();
              }}
            >
              {similar ? 'Add it anyway' : 'Add method'}
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          {similar && <Similar similar={similar} name={name} />}
          <Input
            label="Name"
            required
            autoFocus
            value={name}
            placeholder="Mobile money"
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Reports count it with"
            value={kind}
            onChange={(e) => setKind(e.target.value as PaymentMethod)}
            options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </Drawer>
    </Can>
  );
}

export function MethodActions({ method }: { method: Method }) {
  const [open, setOpen] = useState<'rename' | 'delete' | null>(null);
  const [name, setName] = useState(method.name);
  const { send, busy, error, similar, reset } = useSend();
  const close = () => {
    setOpen(null);
    reset();
  };
  const path = `/finance/payment-methods/${method.id}`;

  return (
    <Can permission="finance.accounts.manage">
      <ActionsMenu label={`Actions for ${method.name}`}>
        <Item onClick={() => setOpen('rename')}>Rename</Item>
        <Item
          onClick={() =>
            void send(`${path}/${method.isActive ? 'deactivate' : 'activate'}`, 'POST')
          }
        >
          {method.isActive ? 'Turn off' : 'Turn on'}
        </Item>
        <Item onClick={() => setOpen('delete')}>Delete</Item>
      </ActionsMenu>
      {error && !open && <span className="ml-2 text-[11.5px] text-danger">{error}</span>}

      <Drawer
        open={open === 'rename'}
        onClose={close}
        title={`Rename ${method.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={name.trim().length < 2 ? ['Name'] : []}
              onClick={async () => {
                if (await send(path, 'PATCH', { name, confirmDistinct: Boolean(similar) })) close();
              }}
            >
              Rename
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          {similar && <Similar similar={similar} name={name} />}
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </Drawer>

      <Dialog
        open={open === 'delete'}
        onClose={close}
        title={`Delete ${method.name}?`}
        description="Only a method that never had an account can be deleted. Otherwise turn it off."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (await send(path, 'DELETE')) close();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
      </Dialog>
    </Can>
  );
}

// ── Accounts ────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

export function NewAccountButton({
  methods,
  baseCurrency,
}: {
  methods: Method[];
  baseCurrency: string;
}) {
  const active = methods.filter((m) => m.isActive);
  const blank = {
    methodId: active[0]?.id ?? '',
    name: '',
    currency: baseCurrency,
    number: '',
    openingBalance: '0',
    openingDate: today(),
    notes: '',
  };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(blank);
  const { send, busy, error, fieldErrors, similar, reset } = useSend();
  const set = (key: keyof typeof blank, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const close = () => {
    setOpen(false);
    setValues(blank);
    reset();
  };

  if (active.length === 0) return null;

  return (
    <Can permission="finance.accounts.manage">
      <Button onClick={() => setOpen(true)}>+ Account</Button>
      <Drawer
        open={open}
        onClose={close}
        title="Add an account"
        description="A place money is held: a till, a mobile money number, a bank account."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={
                [
                  values.name.trim().length < 2 && 'Name',
                  !values.openingDate && 'Opening date',
                ].filter(Boolean) as string[]
              }
              onClick={async () => {
                const ok = await send('/finance/accounts', 'POST', {
                  ...values,
                  number: values.number || undefined,
                  notes: values.notes || undefined,
                  confirmDistinct: Boolean(similar),
                });
                if (ok) close();
              }}
            >
              {similar ? 'Add it anyway' : 'Add account'}
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          {similar && <Similar similar={similar} name={values.name} />}
          <Select
            label="Payment method"
            required
            value={values.methodId}
            onChange={(e) => set('methodId', e.target.value)}
            options={active.map((m) => ({ value: m.id, label: m.name }))}
          />
          <Input
            label="Name"
            required
            placeholder="M-PESA, NMB-TSH, NMB-USD"
            value={values.name}
            error={fieldErrors.name?.[0]}
            onChange={(e) => set('name', e.target.value)}
          />
          <Input
            label="Currency"
            required
            hint={`Three letters. Most accounts are ${baseCurrency}.`}
            maxLength={3}
            value={values.currency}
            error={fieldErrors.currency?.[0]}
            onChange={(e) => set('currency', e.target.value.toUpperCase())}
          />
          <Input
            label="Account or till number"
            hint="Optional."
            value={values.number}
            onChange={(e) => set('number', e.target.value)}
          />
          <OpeningFields
            balance={values.openingBalance}
            date={values.openingDate}
            currency={values.currency}
            errors={fieldErrors}
            onBalance={(v) => set('openingBalance', v)}
            onDate={(v) => set('openingDate', v)}
          />
          <Input
            label="Notes"
            hint="Optional."
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </Drawer>
    </Can>
  );
}

function OpeningFields({
  balance,
  date,
  currency,
  errors,
  onBalance,
  onDate,
}: {
  balance: string;
  date: string;
  currency: string;
  errors: Record<string, string[] | undefined>;
  onBalance: (value: string) => void;
  onDate: (value: string) => void;
}) {
  return (
    <>
      <Input
        label={`Opening balance (${currency || '—'})`}
        required
        inputMode="decimal"
        hint="What it held when the books started counting it. Count it, or copy it from the statement."
        value={balance}
        error={errors.openingBalance?.[0]}
        onChange={(e) => onBalance(e.target.value.replace(/[^\d.,-]/g, ''))}
      />
      <Input
        label="Counted on"
        required
        type="date"
        hint="Entries on this account start from this day."
        value={date}
        error={errors.openingDate?.[0]}
        onChange={(e) => onDate(e.target.value)}
      />
    </>
  );
}

export function AccountActions({
  account,
  methodActive,
}: {
  account: FinanceAccountView;
  methodActive: boolean;
}) {
  const [open, setOpen] = useState<'edit' | 'ask' | 'delete' | null>(null);
  const edit = {
    name: account.name,
    number: account.number ?? '',
    notes: account.notes,
    currency: account.currency,
    openingBalance: account.openingBalance,
    openingDate: account.openingDate,
  };
  const [values, setValues] = useState(edit);
  const [reason, setReason] = useState('');
  const { send, busy, error, fieldErrors, similar, reset } = useSend();
  const set = (key: keyof typeof edit, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const close = () => {
    setOpen(null);
    setValues(edit);
    setReason('');
    reset();
  };
  const used = account.uses > 0;
  const path = `/finance/accounts/${account.id}`;

  // Only what was changed is sent; what every balance rests on is left out
  // once the account is used, because that is a request instead.
  const changed = Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        value !== edit[key as keyof typeof edit] &&
        (!used || ['name', 'number', 'notes'].includes(key)),
    ),
  );
  const asked = Object.fromEntries(
    (['currency', 'openingBalance', 'openingDate'] as const)
      .filter((key) => values[key] !== edit[key])
      .map((key) => [key, values[key]]),
  );

  return (
    <Can permission="finance.accounts.manage">
      <ActionsMenu label={`Actions for ${account.name}`}>
        <Item onClick={() => setOpen('edit')}>Change details</Item>
        {used && !account.openRequest && (
          <Item onClick={() => setOpen('ask')}>Ask to change the opening balance or currency</Item>
        )}
        {(account.isActive || methodActive) && (
          <Item
            onClick={() =>
              void send(`${path}/${account.isActive ? 'deactivate' : 'activate'}`, 'POST')
            }
          >
            {account.isActive ? 'Turn off' : 'Turn on'}
          </Item>
        )}
        {!used && <Item onClick={() => setOpen('delete')}>Delete</Item>}
      </ActionsMenu>

      <Drawer
        open={open === 'edit'}
        onClose={close}
        title={`Change ${account.name}`}
        description={
          used
            ? 'Its opening balance and currency are set: the balances of every day since rest on them. Ask for a change from the menu instead.'
            : 'Nothing is recorded against it yet, so everything can still change.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={Object.keys(changed).length === 0 ? ['a change to something'] : []}
              onClick={async () => {
                if (await send(path, 'PATCH', { ...changed, confirmDistinct: Boolean(similar) }))
                  close();
              }}
            >
              Save
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          {similar && <Similar similar={similar} name={values.name} />}
          <Input
            label="Name"
            required
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <Input
            label="Account or till number"
            value={values.number}
            onChange={(e) => set('number', e.target.value)}
          />
          {!used && (
            <>
              <Input
                label="Currency"
                required
                maxLength={3}
                value={values.currency}
                error={fieldErrors.currency?.[0]}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
              />
              <OpeningFields
                balance={values.openingBalance}
                date={values.openingDate}
                currency={values.currency}
                errors={fieldErrors}
                onBalance={(v) => set('openingBalance', v)}
                onDate={(v) => set('openingDate', v)}
              />
            </>
          )}
          <Input
            label="Notes"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </Drawer>

      <Drawer
        open={open === 'ask'}
        onClose={close}
        title={`Ask to change ${account.name}`}
        description="Every balance of this account rests on these. An administrator sees exactly what you propose, and decides."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={
                [
                  Object.keys(asked).length === 0 && 'a change to something',
                  reason.trim().length < 5 && 'What was wrong?',
                ].filter(Boolean) as string[]
              }
              onClick={async () => {
                if (await send(`${path}/change-requests`, 'POST', { proposed: asked, reason }))
                  close();
              }}
            >
              Send request
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Currency"
            required
            maxLength={3}
            hint="Entries already recorded stay in the currency they were recorded in."
            value={values.currency}
            error={fieldErrors.currency?.[0]}
            onChange={(e) => set('currency', e.target.value.toUpperCase())}
          />
          <OpeningFields
            balance={values.openingBalance}
            date={values.openingDate}
            currency={values.currency}
            errors={fieldErrors}
            onBalance={(v) => set('openingBalance', v)}
            onDate={(v) => set('openingDate', v)}
          />
          <Input
            label="What was wrong?"
            required
            value={reason}
            placeholder="Counted the till again: it held 50,000 more"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Drawer>

      <Dialog
        open={open === 'delete'}
        onClose={close}
        title={`Delete ${account.name}?`}
        description="Nothing was ever recorded against it, so it can go."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (await send(path, 'DELETE')) close();
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
      </Dialog>
    </Can>
  );
}

// ── Exchange rates ──────────────────────────────────────────────────────

export function SetRateButton({
  currencies,
  baseCurrency,
}: {
  currencies: string[];
  baseCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(currencies[0] ?? '');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const { send, busy, error, fieldErrors, reset } = useSend();
  const close = () => {
    setOpen(false);
    setRate('');
    setNote('');
    reset();
  };
  if (currencies.length === 0) return null;

  return (
    <Can permission="finance.accounts.manage">
      <Button size="sm" onClick={() => setOpen(true)}>
        Set today’s rate
      </Button>
      <Drawer
        open={open}
        onClose={close}
        title="Set today’s rate"
        description="From now on, new entries in this currency use it. Entries already recorded keep the rate they have."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={!rate.trim() ? ['Rate'] : []}
              onClick={async () => {
                if (
                  await send('/finance/exchange-rates', 'POST', {
                    currency,
                    rate,
                    note: note || undefined,
                  })
                )
                  close();
              }}
            >
              Set rate
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Select
            label="Currency"
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={currencies.map((c) => ({ value: c, label: c }))}
          />
          <Input
            label={`${baseCurrency} for 1 ${currency}`}
            required
            inputMode="decimal"
            placeholder="2650"
            value={rate}
            error={fieldErrors.rate?.[0]}
            onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))}
          />
          <Input
            label="Where it came from"
            hint="Optional. The bank's buying rate, a bureau, the day's slip."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Drawer>
    </Can>
  );
}

// ── The menu ────────────────────────────────────────────────────────────

function ActionsMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Menu>
      <MenuButton
        aria-label={label}
        className="inline-flex h-8 items-center rounded-[7px] border border-border px-2.5 text-[12px] text-fg2 hover:bg-hover"
      >
        Change ▾
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-20 mt-1 w-64 rounded-[10px] border border-border bg-surface py-1 shadow-xl"
      >
        {children}
      </MenuItems>
    </Menu>
  );
}

function Item({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <MenuItem>
      <button
        type="button"
        onClick={onClick}
        className="w-full px-3 py-2 text-left text-[12.5px] text-fg data-focus:bg-hover"
      >
        {children}
      </button>
    </MenuItem>
  );
}

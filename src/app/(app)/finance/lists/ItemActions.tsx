'use client';

import { useState, type ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import type { CatalogItem } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Can } from '@/lib/session';
import { NewItemDrawer } from '@/modules/finance/components/NewItemDrawer';

type Kind = 'income' | 'expense';
const NOUN = { income: 'income source', expense: 'expense item' } as const;

/**
 * What can be done to an item, from its card's menu: edit its name and what
 * it is for, count an income source as an offering, stop using it (after
 * saying what that means), or use it again.
 */
export function ItemActions({ kind, item }: { kind: Kind; item: CatalogItem }) {
  const router = useRouter();
  const path = kind === 'income' ? 'income-sources' : 'expense-items';
  const [open, setOpen] = useState<'edit' | 'stop' | null>(null);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(run: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await run();
      setOpen(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const changed = {
    ...(name.trim() !== item.name ? { name } : {}),
    ...(description.trim() !== item.description ? { description } : {}),
  };

  return (
    <Can permission="finance.catalog.manage">
      <Menu>
        <MenuButton
          aria-label={`Manage ${item.name}`}
          title={`Manage ${item.name}`}
          className="flex size-8 items-center justify-center rounded-full text-fg3 hover:bg-hover hover:text-fg"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
            <circle cx="3.5" cy="8" r="1.4" />
            <circle cx="8" cy="8" r="1.4" />
            <circle cx="12.5" cy="8" r="1.4" />
          </svg>
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="z-30 mt-1 w-72 rounded-[12px] border border-border bg-surface p-1 shadow-xl"
        >
          <Item onClick={() => setOpen('edit')} hint="Past entries show the new name">
            Rename or describe
          </Item>
          {kind === 'income' && (
            <Item
              onClick={() =>
                call(() =>
                  clientApi(`/finance/${path}/${item.id}`, {
                    method: 'PATCH',
                    body: { countsAsOffering: !item.countsAsOffering },
                  }),
                )
              }
              hint="Offerings are shown on their own to the pastors"
            >
              {item.countsAsOffering ? 'Stop counting as an offering' : 'Count as an offering'}
            </Item>
          )}
          {item.isActive ? (
            <Item onClick={() => setOpen('stop')} hint="No longer offered when recording">
              Stop using…
            </Item>
          ) : (
            <Item
              onClick={() =>
                call(() => clientApi(`/finance/${path}/${item.id}/activate`, { method: 'POST' }))
              }
              hint="Offered again when recording"
            >
              Use again
            </Item>
          )}
        </MenuItems>
      </Menu>

      <Drawer
        open={open === 'edit'}
        onClose={() => setOpen(null)}
        title={`Edit ${NOUN[kind]}`}
        description="Every entry already recorded under it shows the new name."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <SubmitButton
              loading={busy}
              missing={name.trim().length < 2 ? ['Name'] : []}
              disabled={Object.keys(changed).length === 0}
              onClick={() =>
                call(() =>
                  clientApi(`/finance/${path}/${item.id}`, { method: 'PATCH', body: changed }),
                )
              }
            >
              Save
            </SubmitButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label="What it is for"
            placeholder={
              kind === 'income' ? 'Sunday offerings in the bowl' : 'Diesel for the generator'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Drawer>

      <Dialog
        open={open === 'stop'}
        onClose={() => setOpen(null)}
        title={`Stop using "${item.name}"?`}
        description={`It stops being offered when recording ${kind === 'income' ? 'income' : 'expenses'}. ${
          item.uses
            ? `Its ${item.uses} past ${item.uses === 1 ? 'entry keeps' : 'entries keep'} it, in the books and the reports.`
            : 'Nothing was recorded under it yet.'
        } You can use it again at any time.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Keep using it
            </Button>
            <Button
              loading={busy}
              onClick={() =>
                call(() => clientApi(`/finance/${path}/${item.id}/deactivate`, { method: 'POST' }))
              }
            >
              Stop using it
            </Button>
          </>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
      </Dialog>
    </Can>
  );
}

function Item({
  onClick,
  children,
  hint,
}: {
  onClick: () => void;
  children: ReactNode;
  hint: string;
}) {
  return (
    <MenuItem>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col rounded-[8px] px-3 py-2 text-left data-focus:bg-hover"
      >
        <span className="text-[12.5px] font-medium text-fg">{children}</span>
        <span className="text-[11px] text-fg3">{hint}</span>
      </button>
    </MenuItem>
  );
}

/** Adding an item from the page rather than from an entry being recorded. */
export function NewItemButton({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  return (
    <Can permission="finance.catalog.create">
      <Button onClick={() => setName('')}>+ New {NOUN[kind]}</Button>
      <NewItemDrawer
        kind={kind}
        name={name}
        onClose={() => setName(null)}
        onCreated={() => {
          setName(null);
          router.refresh();
        }}
      />
    </Can>
  );
}

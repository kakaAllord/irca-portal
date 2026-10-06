'use client';

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import { useMemo, useState } from 'react';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Button } from '@/components/ui/Button';
import { RequiredMark } from '@/components/ui/RequiredMark';
import type { Position } from './types';

export type PositionValue = { id: string; name: string } | null;

/** Spaces tidied and capitals ignored, as the API matches names. */
const key = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');

/**
 * A leader's position: type a few letters and pick from the list
 * administrators keep. When what was typed is not on it, the field says so
 * and offers to add it there and then, so naming the leader carries on
 * without leaving the form (docs/plan/14, step 14.1).
 *
 * The list is short, so it is all loaded once and filtered here; only adding
 * a position goes to the API, which is where a name close to one already
 * there is caught.
 */
export function PositionCombobox({
  positions,
  value,
  onChange,
  onAdded,
}: {
  /** Every position, turned on or off: a turned-off one is named, not offered. */
  positions: Position[];
  value: PositionValue;
  onChange: (value: PositionValue) => void;
  onAdded: (position: Position) => void;
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [similar, setSimilar] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typed = query.trim();
  const offered = useMemo(
    () => positions.filter((p) => p.active && (!typed || key(p.name).includes(key(typed)))),
    [positions, typed],
  );
  const exact = typed ? positions.find((p) => key(p.name) === key(typed)) : undefined;
  const unknown = typed.length >= 2 && !exact && value?.name !== typed;

  function choose(position: { id: string; name: string }) {
    onChange({ id: position.id, name: position.name });
    setQuery(position.name);
    setSimilar(null);
    setError(null);
  }

  async function add(confirmDistinct = false) {
    setAdding(true);
    setError(null);
    try {
      const made = await clientApi<{ id: string; name: string }>('/admin/leader-positions', {
        method: 'POST',
        body: { name: typed, confirmDistinct },
      });
      onAdded({ ...made, sortOrder: positions.length + 1, active: true, holders: 0 });
      choose(made);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'SIMILAR_EXISTS') {
        const candidates = (err.details as { candidates?: { id: string; name: string }[] })
          ?.candidates;
        setSimilar(candidates?.[0] ?? null);
      } else if (err instanceof ApiRequestError && err.code === 'ALREADY_EXISTS') {
        // Another administrator added it a moment ago: use theirs.
        const existing = (err.details as { existing?: Position & { active: boolean } })?.existing;
        if (existing?.active) {
          onAdded({ ...existing, sortOrder: positions.length + 1, holders: 0 });
          choose(existing);
        } else setError(err.message);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Could not add the position.');
      }
    } finally {
      setAdding(false);
    }
  }

  const similarPosition = similar && positions.find((p) => p.id === similar.id);

  return (
    <div className="flex flex-col gap-1.5">
      <Combobox
        value={value}
        onChange={(next: PositionValue) => {
          if (next) choose(next);
          else onChange(null);
        }}
        by={(a, b) => a?.id === b?.id}
        nullable
      >
        <label className="text-[12px] font-medium text-fg2" htmlFor="leader-position">
          Position
          <RequiredMark />
        </label>
        <div className="relative">
          <ComboboxInput
            id="leader-position"
            autoComplete="off"
            className="h-9 w-full rounded-[7px] border border-border bg-input px-3 pr-10 text-[13px] text-fg placeholder:text-fg3 focus:border-accent focus:ring-2 focus:ring-accent-br focus:outline-none"
            placeholder="Chairperson, Secretary…"
            displayValue={(p: PositionValue) => p?.name ?? query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSimilar(null);
              setError(null);
              if (value && key(e.target.value) !== key(value.name)) onChange(null);
            }}
          />
          <ComboboxButton
            className="absolute inset-y-0 right-2 flex items-center text-fg3"
            aria-label="Show positions"
          >
            ▾
          </ComboboxButton>
          {offered.length > 0 && (
            <ComboboxOptions className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[10px] border border-border bg-surface py-1 shadow-xl">
              {offered.map((p) => (
                <ComboboxOption
                  key={p.id}
                  value={{ id: p.id, name: p.name }}
                  className="cursor-pointer px-3 py-1.5 text-[12.5px] text-fg data-focus:bg-hover"
                >
                  {p.name}
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          )}
        </div>
      </Combobox>

      {exact && !exact.active && value?.id !== exact.id && (
        <p className="text-[11.5px] text-fg3">
          “{exact.name}” is turned off. Turn it on in Admin → Departments → Positions to name anyone
          to it.
        </p>
      )}

      {unknown && !similar && (
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-fg3">
          <span>“{typed}” is not a registered position yet.</span>
          <Button size="sm" variant="secondary" loading={adding} onClick={() => void add()}>
            + Add position
          </Button>
        </div>
      )}

      {similar && (
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-fg2">
          <span>Did you mean {similar.name}?</span>
          {similarPosition?.active !== false && (
            <Button size="sm" variant="secondary" onClick={() => choose(similar)}>
              Use {similar.name}
            </Button>
          )}
          <Button size="sm" variant="ghost" loading={adding} onClick={() => void add(true)}>
            No, add “{typed}”
          </Button>
        </div>
      )}

      {error && <p className="text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}

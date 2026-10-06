'use client';

import { ACCOUNT_KINDS, type AccountKindKey } from '@/shared';

/** The kinds an administrator gives: the developer only comes from the command line. */
export const GIVEN_HERE = (Object.keys(ACCOUNT_KINDS) as AccountKindKey[]).filter(
  (k) => !ACCOUNT_KINDS[k].cliOnly,
);

/**
 * Pastor, administrator, or both (D30), each with what it brings. The people
 * of a department get their portal by being added to it, so they are not
 * chosen here.
 */
export function KindChoice({
  value,
  onChange,
}: {
  value: AccountKindKey[];
  onChange: (kinds: AccountKindKey[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {GIVEN_HERE.map((key) => (
        <label key={key} className="flex items-start gap-2 text-[12.5px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={value.includes(key)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, key] : value.filter((k) => k !== key))
            }
          />
          <span>
            <span className="font-medium text-fg">{ACCOUNT_KINDS[key].label}</span>
            <span className="block text-[11.5px] text-fg3">{ACCOUNT_KINDS[key].description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

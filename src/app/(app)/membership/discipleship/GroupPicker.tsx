'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';

/** Which group the page shows; each choice is the page's own address for it. */
export function GroupPicker({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const id = useId();
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-[12px] font-medium text-fg2">
        Group
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => router.push(e.target.value)}
        className="h-9 min-w-[180px] rounded-[7px] border border-border bg-input px-2.5 text-[12.5px] font-medium text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-br"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

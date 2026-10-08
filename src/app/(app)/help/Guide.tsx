import type { ReactNode } from 'react';
import Link from 'next/link';
import { getMe } from '@/lib/api/me';
import { GUIDES, guidesFor } from '@/lib/guides';
import { PrintButton } from './PrintButton';

/**
 * A one-page guide: readable on a phone, and printable as the sheet handed
 * out at training. The portal's print styles already drop the sidebar and the
 * buttons, so what comes out of the printer is the guide and nothing else.
 *
 * A guide for another portal, opened by its address, says so rather than
 * explaining pages the reader cannot open.
 */
export async function Guide({
  href,
  title,
  intro,
  children,
}: {
  /** This guide's own address, as the list in lib/guides.ts has it. */
  href: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const me = await getMe();
  if (
    GUIDES.some((g) => g.href === href) &&
    !guidesFor(me.permissions).some((g) => g.href === href)
  ) {
    return (
      <article className="mx-auto max-w-[680px]">
        <h1 className="text-[22px] font-semibold text-fg">This guide is for another portal</h1>
        <p className="mt-2 text-[13.5px] text-fg2">
          It explains pages you do not use.{' '}
          <Link href="/help" className="text-accent underline">
            See the guides for yours
          </Link>
          .
        </p>
      </article>
    );
  }
  return (
    <article className="mx-auto max-w-[680px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 print:mb-3">
        <div>
          <Link href="/help" className="text-[11.5px] text-fg3 hover:text-fg2 print:hidden">
            ← Help
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold text-fg">{title}</h1>
          <p className="mt-1 text-[13px] text-fg2">{intro}</p>
        </div>
        <PrintButton />
      </div>
      <div className="flex flex-col gap-5 text-[13.5px] leading-relaxed text-fg">{children}</div>
    </article>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-1.5 flex items-baseline gap-2 text-[15px] font-semibold text-fg">
        <span className="text-fg3 tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="flex flex-col gap-2 pl-5 text-fg2 [&_strong]:font-semibold [&_strong]:text-fg">
        {children}
      </div>
    </section>
  );
}

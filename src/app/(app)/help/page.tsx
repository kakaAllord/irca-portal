import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { guidesFor } from '@/lib/guides';

export const metadata: Metadata = { title: 'Help' };

/**
 * The guides handed out at training, kept here so they are never lost: only
 * the ones for what you use, so Communications is not handed Finance's.
 */
export default async function HelpPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  return (
    <>
      <PageHeader title="Help" subtitle="Each guide is one page, and prints as one." />
      <div className="grid gap-3 sm:grid-cols-2">
        {guidesFor(me.permissions).map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-[10px] border border-border bg-surface p-4 hover:bg-hover"
          >
            <h2 className="text-[14px] font-semibold text-fg">{guide.title}</h2>
            <p className="mt-1 text-[12.5px] text-fg2">{guide.about}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

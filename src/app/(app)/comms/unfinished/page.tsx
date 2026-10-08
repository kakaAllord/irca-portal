import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { UnfinishedList, type Unfinished } from '@/modules/comms/UnfinishedList';

export const metadata: Metadata = { title: 'Unfinished registrations' };

/**
 * Everyone who started the registration form and did not finish it, and
 * sending them their link (D34: reminding people is Communications' work).
 */
export default async function UnfinishedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!can(me, 'comms.registrations.remind')) {
    return <ForbiddenState what="unfinished registrations" />;
  }
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await serverApi<{
    rows: Unfinished[];
    total: number;
    pageSize: number;
  }>(`/comms/unfinished?page=${page}`);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <PageHeader
        title="Unfinished registrations"
        subtitle={`${data.total} ${data.total === 1 ? 'person' : 'people'} started the form and did not finish. Send each their own link, or text them all.`}
        actions={
          can(me, 'comms.messages.send') && (
            <Link
              href="/comms/compose?audience=membership.unfinished"
              className="inline-flex h-8 items-center rounded-[7px] bg-fg px-3 text-[12.5px] font-medium text-bg"
            >
              Text them all
            </Link>
          )
        }
      />
      {data.rows.length === 0 ? (
        <EmptyState title="Everyone finished">Nobody has a form left half way.</EmptyState>
      ) : (
        <UnfinishedList rows={data.rows} timezone={me.church?.timezone ?? 'UTC'} />
      )}
      {pages > 1 && (
        <div className="mt-4 flex gap-3 text-[12.5px]">
          {page > 1 && (
            <Link
              className="text-accent hover:underline"
              href={`/comms/unfinished?page=${page - 1}`}
            >
              Newer
            </Link>
          )}
          {page < pages && (
            <Link
              className="text-accent hover:underline"
              href={`/comms/unfinished?page=${page + 1}`}
            >
              Older
            </Link>
          )}
        </div>
      )}
    </>
  );
}

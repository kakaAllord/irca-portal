import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Previous and next for a server-rendered list, keeping every filter in the
 * address. Nothing shows when everything fits on one page.
 */
export function Pager({
  path,
  params,
  page,
  pageSize,
  total,
}: {
  path: string;
  /** The list's current filters, without the page. */
  params: URLSearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (n: number) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set('page', String(n));
    else next.delete('page');
    return `${path}${next.size ? `?${next}` : ''}`;
  };
  const link = (n: number, label: string, enabled: boolean) =>
    enabled ? (
      <Link
        href={href(n)}
        className="inline-flex h-8 items-center rounded-[7px] border border-border px-3 text-[12px] font-medium text-fg hover:bg-hover"
      >
        {label}
      </Link>
    ) : (
      <span
        aria-disabled="true"
        className={cn(
          'inline-flex h-8 items-center rounded-[7px] border border-border2 px-3 text-[12px] text-fg3',
        )}
      >
        {label}
      </span>
    );

  return (
    <nav aria-label="Pages" className="mt-3 flex items-center justify-end gap-2">
      <span className="mr-1 text-[11.5px] text-fg3 tabular-nums">
        Page {page} of {pages}
      </span>
      {link(page - 1, 'Previous', page > 1)}
      {link(page + 1, 'Next', page < pages)}
    </nav>
  );
}

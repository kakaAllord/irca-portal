import { cn } from '@/lib/cn';

/** One grey bar. Pulses until the real thing arrives, and holds still for anyone who asked for less motion. */
export function Bar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[6px] bg-chip motion-reduce:animate-none', className)}
    />
  );
}

/**
 * What every signed-in page shows while its data is on the way: the page's
 * name and filter row as bars, then a table's worth of rows. It is the same
 * shape as most pages, so the screen does not jump when they arrive.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="mb-5 space-y-2">
        <Bar className="h-6 w-48" />
        <Bar className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Bar className="h-8 w-24" />
        <Bar className="h-8 w-24" />
        <Bar className="h-8 w-24" />
      </div>
      <div className="overflow-hidden rounded-[10px] border border-border">
        <div className="border-b border-border bg-thead px-3 py-3">
          <Bar className="h-3 w-40" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-border2 px-3 py-3.5 first:border-t-0"
          >
            <Bar className="h-3.5 w-1/4" />
            <Bar className="h-3.5 w-1/3" />
            <Bar className="hidden h-3.5 w-1/6 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The portal's frame as grey shapes, shown for the moment it takes the API to
 * say who is signed in. The sidebar's items depend on that answer, so they
 * cannot be drawn yet; the frame can.
 */
export function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1">
        <aside className="hidden w-[218px] flex-none border-r border-border bg-sidebar p-4 md:block">
          <Bar className="mb-6 h-7 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Bar key={i} className="h-4 w-full" />
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5 md:justify-end">
            <Bar className="h-6 w-16 md:hidden" />
            <Bar className="ml-auto h-6 w-28 md:ml-0" />
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-7">
            <PageSkeleton />
          </main>
        </div>
      </div>
    </div>
  );
}

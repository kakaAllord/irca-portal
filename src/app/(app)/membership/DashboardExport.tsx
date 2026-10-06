import { Can } from '@/lib/session';

/** The dashboard's figures as a PDF: counts only, never a name. */
export function DashboardExport() {
  return (
    <Can permission="membership.people.export">
      <a
        href="/api/membership/dashboard.pdf"
        className="inline-flex h-9 items-center rounded-[7px] border border-border px-3.5 text-[12.5px] font-medium text-fg hover:bg-hover"
      >
        Download PDF
      </a>
    </Can>
  );
}

import { cn } from '@/lib/cn';
import { Logo } from '@/components/Logo';

/** A report as the API describes it: the same description the PDF prints. */
export type ReportDoc = {
  kind: string;
  from: string;
  to: string;
  title: string;
  period?: string;
  landscape?: boolean;
  filename: string;
  sections: {
    heading?: string;
    tiles?: { label: string; value: string; note?: string }[];
    table?: {
      columns: { label: string; align?: 'left' | 'right' }[];
      rows: string[][];
      total?: string[];
      empty?: string;
    };
    note?: string;
    signatures?: string[];
  }[];
};

/**
 * Shows a report on screen exactly as its PDF lays it out, from the same
 * description, so what someone reads here is what they print.
 */
export function ReportView({ report, church }: { report: ReportDoc; church: string }) {
  return (
    <article className="mx-auto max-w-[1000px] rounded-[6px] border border-border bg-surface px-5 py-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.35)] sm:px-10 sm:py-9">
      <header className="mb-7 flex flex-wrap items-center gap-4 border-b-2 border-fg pb-4">
        <Logo size={48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-fg3 uppercase">{church}</p>
          <h2 className="text-[19px] leading-tight font-semibold text-fg">{report.title}</h2>
        </div>
        {report.period && (
          <p className="rounded-full bg-chip px-3 py-1 text-[12px] font-medium text-fg2">
            {report.period}
          </p>
        )}
      </header>
      <div className="flex flex-col gap-7">
        {report.sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-2">
            {section.heading && (
              <h3 className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-accent uppercase">
                <span aria-hidden="true" className="h-3 w-1 rounded-full bg-accent" />
                {section.heading}
              </h3>
            )}
            {section.tiles && (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border lg:grid-cols-4">
                {section.tiles.map((tile) => (
                  <div key={tile.label} className="bg-surface2 p-4">
                    <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">
                      {tile.label}
                    </p>
                    <p className="mt-1 text-[19px] font-semibold tabular-nums text-fg">
                      {tile.value}
                    </p>
                    {tile.note && <p className="mt-0.5 text-[11.5px] text-fg3">{tile.note}</p>}
                  </div>
                ))}
              </div>
            )}
            {section.table &&
              (section.table.rows.length === 0 && section.table.empty ? (
                <p className="text-[12.5px] text-fg3">{section.table.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-[12px]">
                    <thead>
                      <tr className="bg-surface2 text-[10.5px] tracking-wide text-fg3 uppercase">
                        {section.table.columns.map((c, j) => (
                          <th
                            key={j}
                            className={cn(
                              'border-b border-border px-3 py-2 font-semibold',
                              c.align === 'right' ? 'text-right' : 'text-left',
                            )}
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, r) => (
                        <tr key={r} className="border-b border-border2 even:bg-surface2/50">
                          {row.map((value, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-3 py-2 text-fg',
                                section.table!.columns[j]?.align === 'right'
                                  ? 'text-right tabular-nums whitespace-nowrap'
                                  : '',
                              )}
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {section.table.total && (
                        <tr className="border-t-2 border-double border-fg font-semibold">
                          {section.table.total.map((value, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-3 py-2.5 text-fg',
                                section.table!.columns[j]?.align === 'right'
                                  ? 'text-right tabular-nums whitespace-nowrap'
                                  : '',
                              )}
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            {section.note && <p className="text-[11.5px] text-fg3">{section.note}</p>}
            {section.signatures && (
              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                {section.signatures.map((who) => (
                  <div key={who} className="border-t border-fg pt-1 text-[11.5px] text-fg2">
                    {who}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

import { cn } from '@/lib/cn';

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
export function ReportView({ report }: { report: ReportDoc }) {
  return (
    <article className="rounded-[10px] border border-border bg-surface p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-[16px] font-semibold text-fg">{report.title}</h2>
        {report.period && <p className="text-[12.5px] text-fg2">{report.period}</p>}
      </header>
      <div className="flex flex-col gap-5">
        {report.sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-2">
            {section.heading && (
              <h3 className="text-[13px] font-semibold text-fg">{section.heading}</h3>
            )}
            {section.tiles && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {section.tiles.map((tile) => (
                  <div key={tile.label} className="rounded-[10px] border border-border2 p-3">
                    <p className="text-[11px] font-semibold tracking-wide text-fg3 uppercase">
                      {tile.label}
                    </p>
                    <p className="mt-1 text-[17px] font-semibold tabular-nums text-fg">
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
                      <tr className="text-[10.5px] tracking-wide text-fg3 uppercase">
                        {section.table.columns.map((c, j) => (
                          <th
                            key={j}
                            className={cn(
                              'border-b border-border px-2 py-1.5 font-semibold first:pl-0',
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
                        <tr key={r} className="border-b border-border2">
                          {row.map((value, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-2 py-1.5 text-fg first:pl-0',
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
                        <tr className="font-semibold">
                          {section.table.total.map((value, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-2 py-1.5 text-fg first:pl-0',
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

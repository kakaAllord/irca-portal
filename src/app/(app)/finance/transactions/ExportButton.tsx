/** The same filters as the list, as a PDF (D42). */
export function ExportButton({ query }: { query: string }) {
  return (
    <a
      href={`/api/finance/transactions/export.pdf?${query}`}
      className="inline-flex h-9 items-center rounded-[7px] border border-border px-3.5 text-[12.5px] font-medium text-fg hover:bg-hover"
    >
      Download PDF
    </a>
  );
}

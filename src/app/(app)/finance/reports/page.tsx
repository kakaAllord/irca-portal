import type { Metadata } from 'next';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { ReportView, type ReportDoc } from '@/modules/finance/reports/ReportView';
import { PeriodSwitch, type ReportKind } from './PeriodSwitch';

export const metadata: Metadata = { title: 'Reports' };

const KINDS: ReportKind[] = ['day', 'week', 'month', 'year', 'custom', 'position', 'months'];

/** "2026-05" when the value starts with a month, else the fallback. */
const monthOr = (value: string | undefined, fallback: string) =>
  value && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : fallback;

/**
 * Finance's reports at any time (docs/plan/16, steps 16.2 and 16.3): one
 * switch for the period, the report on screen, and the same report as a PDF.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; date?: string; from?: string; to?: string }>;
}) {
  const me = await getMe();
  if (!can(me, 'finance.reports.read')) return <ForbiddenState what="finance reports" />;

  const params = await searchParams;
  const kind = (KINDS as string[]).includes(params.kind ?? '')
    ? (params.kind as ReportKind)
    : 'month';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: me.church?.timezone ?? 'Africa/Dar_es_Salaam',
  }).format(new Date());
  const date = params.date ?? today;
  const from = params.from ?? `${today.slice(0, 7)}-01`;
  const to = params.to ?? today;

  // The finance report runs over whole months: from January to this month unless chosen.
  const monthsTo = monthOr(kind === 'months' ? params.to : undefined, today.slice(0, 7));
  const months = {
    from: monthOr(kind === 'months' ? params.from : undefined, `${monthsTo.slice(0, 4)}-01`),
    to: monthsTo,
  };

  const query =
    kind === 'position'
      ? `asAt=${date}`
      : kind === 'months'
        ? `from=${months.from}&to=${months.to}`
        : kind === 'custom'
          ? `kind=custom&from=${from}&to=${to}`
          : `kind=${kind}&date=${date}`;
  const path = kind === 'position' ? 'position' : kind === 'months' ? 'months' : 'period';
  const report = await serverApi<ReportDoc>(`/finance/reports/${path}?${query}`);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="The church's position, a day, week, month or year, or the finance report month by month."
        actions={
          <div className="flex flex-wrap gap-2">
            {kind === 'months' && (
              <a
                href={`/api/finance/reports/months.xlsx?${query}`}
                download={report.filename.replace(/\.pdf$/, '.xlsx')}
                className="inline-flex h-9 items-center rounded-[7px] border border-border bg-surface px-3.5 text-[12.5px] font-medium text-fg hover:bg-surface2"
              >
                Download Excel
              </a>
            )}
            <a
              href={`/api/finance/reports/${path}.pdf?${query}`}
              download={report.filename}
              className="inline-flex h-9 items-center rounded-[7px] bg-btn-bg px-3.5 text-[12.5px] font-medium text-btn-fg hover:opacity-90"
            >
              Download PDF
            </a>
          </div>
        }
      />
      <PeriodSwitch kind={kind} date={date} from={from} to={to} today={today} months={months} />
      <div className="mt-4">
        <ReportView report={report} church={me.church?.name ?? 'The church'} />
      </div>
    </>
  );
}

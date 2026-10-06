import type { Metadata } from 'next';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { ReportView, type ReportDoc } from '@/modules/finance/reports/ReportView';
import { PeriodSwitch, type ReportKind } from './PeriodSwitch';

export const metadata: Metadata = { title: 'Reports' };

const KINDS: ReportKind[] = ['day', 'week', 'month', 'year', 'custom', 'position'];

/**
 * Finance's reports at any time (docs/plan/16, steps 16.2 and 16.3): one
 * switch for the period, the report on screen, and the same report as a PDF.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; date?: string; from?: string; to?: string }>;
}) {
  const me = await serverApi<MeResponse>('/auth/me');
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

  const query =
    kind === 'position'
      ? `asAt=${date}`
      : kind === 'custom'
        ? `kind=custom&from=${from}&to=${to}`
        : `kind=${kind}&date=${date}`;
  const path = kind === 'position' ? 'position' : 'period';
  const report = await serverApi<ReportDoc>(`/finance/reports/${path}?${query}`);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="The church's position, or a day, week, month or year, at any time."
        actions={
          <a
            href={`/api/finance/reports/${path}.pdf?${query}`}
            download={report.filename}
            className="inline-flex h-9 items-center rounded-[7px] bg-btn-bg px-3.5 text-[12.5px] font-medium text-btn-fg hover:opacity-90"
          >
            Download PDF
          </a>
        }
      />
      <PeriodSwitch kind={kind} date={date} from={from} to={to} today={today} />
      <div className="mt-4">
        <ReportView report={report} />
      </div>
    </>
  );
}

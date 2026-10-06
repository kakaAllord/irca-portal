import type { Metadata } from 'next';
import Link from 'next/link';
import {
  formatMoney,
  PLEDGE_STATUS_LABEL,
  type MeResponse,
  type PledgeCampaignView,
  type PledgeView,
} from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { EmptyState, ForbiddenState } from '@/components/shell/States';
import { Badge } from '@/components/ui/Badge';
import { Table, Row, Cell } from '@/components/ui/Table';

export const metadata: Metadata = { title: 'Who pledged' };

/**
 * Who pledged what to one campaign, for the pastors (D41), read-only and
 * reached from the Finance summary. Recording and correcting stay in the
 * Finance portal.
 */
export default async function CampaignNamesPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'finance.pledges.read_sensitive')) {
    return <ForbiddenState what="who pledged what" />;
  }
  const [campaign, pledges] = await Promise.all([
    serverApi<PledgeCampaignView>(`/finance/pledge-campaigns/${campaignId}`),
    serverApi<PledgeView[]>(`/finance/pledge-campaigns/${campaignId}/pledges?filter=all`),
  ]);
  const currency = me.church?.currency ?? 'TZS';
  const money = (v: string) => formatMoney(v, currency);

  return (
    <>
      <Link href={`/departments/${id}`} className="text-[12px] text-fg2 hover:text-fg">
        ← Finance
      </Link>
      <div className="mt-2">
        <PageHeader
          title={campaign.name}
          subtitle={`${money(campaign.promised)} pledged, ${money(campaign.received)} paid, ${money(campaign.outstanding)} still to come.`}
        />
      </div>
      {pledges.length === 0 ? (
        <EmptyState title="Nobody has pledged yet" />
      ) : (
        <Table head={['Name', 'Pledged', 'Paid', 'Remaining', '']}>
          {pledges.map((p) => (
            <Row key={p.id}>
              <Cell>
                <span className="font-medium text-fg">{p.person?.name ?? 'Erased'}</span>
              </Cell>
              <Cell nowrap>
                <span className="tabular-nums text-fg2">{money(p.amount)}</span>
              </Cell>
              <Cell nowrap>
                <span className="tabular-nums text-fg2">{money(p.paid)}</span>
              </Cell>
              <Cell nowrap>
                <span className="tabular-nums text-fg">{money(p.balance)}</span>
              </Cell>
              <Cell nowrap>
                {p.overdue ? (
                  <Badge tone="accent">Overdue</Badge>
                ) : (
                  <Badge tone={p.status === 'OPEN' ? 'muted' : 'positive'}>
                    {PLEDGE_STATUS_LABEL[p.status]}
                  </Badge>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}

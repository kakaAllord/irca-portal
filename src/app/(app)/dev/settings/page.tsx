import type { Metadata } from 'next';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import type {
  AlertsSettings,
  ChurchSettings as Settings,
  MessagingSettings,
} from '@/modules/dev/types';
import { ChurchSettings } from './ChurchSettings';
import { EmailCard, LogLevelCard, TextsCard } from './Messaging';
import { Alerts } from './Alerts';

export const metadata: Metadata = { title: 'Settings' };

/**
 * What is set once at launch and rarely after: the church itself, how the
 * system reaches people (email and texts, D52), who hears when something goes
 * wrong, and how much the server writes to its log.
 */
export default async function SettingsPage() {
  const me = await getMe();
  if (!can(me, 'dev.church.manage')) return <ForbiddenState what="the settings" />;

  const [church, messaging, alerts] = await Promise.all([
    serverApi<Settings>('/dev/church'),
    serverApi<MessagingSettings>('/dev/messaging'),
    serverApi<AlertsSettings>('/dev/alerts'),
  ]);
  // The API's public address is the one this server reaches it at; the API
  // does not know its own.
  const replyUrl = `${process.env.API_INTERNAL_URL}/v1/public/comms/inbound?key=${messaging.beem.replyKey}`;

  return (
    <>
      <PageHeader title="Settings" subtitle="The church, email and texts, alerts, and the log." />
      <div className="flex flex-col gap-6">
        <ChurchSettings church={church} />
        <EmailCard email={messaging.email} />
        <TextsCard beem={messaging.beem} replyUrl={replyUrl} />
        <Alerts alerts={alerts} />
        <LogLevelCard log={messaging.log} />
      </div>
    </>
  );
}

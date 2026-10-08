import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { serverApi } from '@/lib/api/server';
import { getMe } from '@/lib/api/me';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import type {
  AlertsSettings,
  ChurchSettings as Settings,
  DriveSettings,
  MessagingSettings,
} from '@/modules/dev/types';
import { ChurchSettings } from './ChurchSettings';
import { Card, EmailCard, LogLevelCard, TextsCard } from './Messaging';
import { Alerts } from './Alerts';
import { DriveCard } from './DriveCard';

export const metadata: Metadata = { title: 'Settings' };

/**
 * What is set once at launch and rarely after: the church itself, how the
 * system reaches people (email and texts, D52), where files are kept (D58),
 * who hears when something goes wrong, and how much the server writes to its
 * log. `?drive=` is what Google's return said (google-drive/route.ts).
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!can(me, 'dev.church.manage')) return <ForbiddenState what="the settings" />;

  const [church, messaging, drive, alerts, query] = await Promise.all([
    serverApi<Settings>('/dev/church'),
    serverApi<MessagingSettings>('/dev/messaging'),
    // Optional: the portal may be deployed before an API that has it, and
    // the rest of Settings must still open.
    serverApi<DriveSettings>('/dev/files/drive').catch((err: unknown) => {
      unstable_rethrow(err);
      return null;
    }),
    serverApi<AlertsSettings>('/dev/alerts'),
    searchParams,
  ]);
  const outcome =
    query.drive === 'connected'
      ? { tone: 'info' as const, text: `Connected. Files now go to ${drive?.account}.` }
      : query.drive === 'failed'
        ? { tone: 'error' as const, text: query.why ?? 'Google did not connect.' }
        : null;
  // The API's public address is the one this server reaches it at; the API
  // does not know its own.
  const replyUrl = `${process.env.API_INTERNAL_URL}/v1/public/comms/inbound?key=${messaging.beem.replyKey}`;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="The church, email and texts, where files are kept, alerts, and the log."
      />
      <div className="flex flex-col gap-6">
        <ChurchSettings church={church} />
        <EmailCard email={messaging.email} />
        <TextsCard beem={messaging.beem} replyUrl={replyUrl} />
        {drive ? (
          <DriveCard drive={drive} outcome={outcome} />
        ) : (
          <Card title="Google Drive" intro="Where uploaded files are kept.">
            <Alert tone="warn">
              The API did not answer for Google Drive. If it was just deployed, the backend may not
              have this yet; everything else here works.
            </Alert>
          </Card>
        )}
        <Alerts alerts={alerts} />
        <LogLevelCard log={messaging.log} />
      </div>
    </>
  );
}

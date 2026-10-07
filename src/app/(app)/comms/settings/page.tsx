import type { Metadata } from 'next';
import type { MeResponse } from '@/shared';
import { serverApi } from '@/lib/api/server';
import { can } from '@/lib/auth/guards';
import { PageHeader } from '@/components/shell/PageHeader';
import { ForbiddenState } from '@/components/shell/States';
import { Alert } from '@/components/ui/Alert';
import { SettingsForm, type CommsSettings } from '@/modules/comms/SettingsForms';

export const metadata: Metadata = { title: 'Comms settings' };

export default async function CommsSettingsPage() {
  const me = await serverApi<MeResponse>('/auth/me');
  if (!can(me, 'comms.settings.manage')) return <ForbiddenState what="messaging settings" />;
  const settings = await serverApi<CommsSettings>('/comms/settings');
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="What messages cost, how much may be spent in a day, and when to warn about credit."
      />
      <div className="flex max-w-2xl flex-col gap-5">
        <section className="rounded-[10px] border border-border bg-surface p-4">
          <h2 className="mb-3 text-[13px] font-semibold text-fg">Cost, limits and quiet hours</h2>
          <SettingsForm settings={settings} />
        </section>
        {/* The account itself is the developer's, in Dev → Settings (D52). */}
        <Alert tone={settings.beem.saved && settings.beem.live ? 'info' : 'warn'}>
          {settings.beem.saved && settings.beem.live
            ? `Texts go out through Beem, as ${settings.beem.senderId}.`
            : 'No Beem account is set up yet, so texts are only written to the server log. Whoever runs the system sets it up in Dev → Settings.'}
        </Alert>
      </div>
    </>
  );
}

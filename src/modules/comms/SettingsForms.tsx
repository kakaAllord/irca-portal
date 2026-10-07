'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { LANG_LABEL } from './types';

export type CommsSettings = {
  pricePerSegment: string;
  dailyCap: string | null;
  defaultLang: 'en' | 'sw' | 'fr';
  quietHours: string;
  personCooldownDays: number;
  balanceAlertFloor: number;
  beem: {
    saved: boolean;
    senderId: string | null;
    keyHint: string | null;
    updatedAt: string | null;
    canSave: boolean;
    live: boolean;
  };
};

/** The price, the daily limit, quiet hours and the default language. */
export function SettingsForm({ settings }: { settings: CommsSettings }) {
  const router = useRouter();
  const [price, setPrice] = useState(settings.pricePerSegment);
  const [cap, setCap] = useState(settings.dailyCap ?? '');
  const [lang, setLang] = useState(settings.defaultLang);
  const [from, to] = settings.quietHours.split('-');
  const [quietFrom, setQuietFrom] = useState(from ?? '21:00');
  const [quietTo, setQuietTo] = useState(to ?? '07:00');
  const [cooldown, setCooldown] = useState(String(settings.personCooldownDays));
  const [floor, setFloor] = useState(String(settings.balanceAlertFloor));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    setErrors({});
    try {
      await clientApi('/comms/settings', {
        method: 'PUT',
        body: {
          pricePerSegment: price,
          dailyCap: cap.trim() || null,
          defaultLang: lang,
          quietHours: `${quietFrom}-${quietTo}`,
          personCooldownDays: Number(cooldown),
          balanceAlertFloor: Number(floor),
        },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrors(err.fieldErrors);
        setError(err.message);
      } else setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Price per segment (TZS)"
          required
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          hint="From Beem's price list."
          error={errors.pricePerSegment?.[0]}
        />
        <Input
          label="Daily limit (TZS)"
          inputMode="decimal"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          hint="Empty for no limit. A send that would pass a limit is refused."
          error={errors.dailyCap?.[0]}
        />
        <Input
          label="Quiet from"
          type="time"
          required
          value={quietFrom}
          onChange={(e) => setQuietFrom(e.target.value)}
          hint="Recurring messages wait until it ends."
        />
        <Input
          label="Quiet until"
          type="time"
          required
          value={quietTo}
          onChange={(e) => setQuietTo(e.target.value)}
        />
        <Input
          label="Days between reminders"
          required
          type="number"
          min={0}
          max={90}
          value={cooldown}
          onChange={(e) => setCooldown(e.target.value)}
          hint="A reminder, such as a pledge reminder, reaches nobody twice within this many days, whoever sends it."
          error={errors.personCooldownDays?.[0]}
        />
        <Input
          label="Warn when credit falls below"
          required
          type="number"
          min={0}
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          hint="Beem's credit, as Test connection shows it. You and the system's owner are emailed and texted. 0: never warn."
          error={errors.balanceAlertFloor?.[0]}
        />
        <Select
          label="Default language"
          value={lang}
          onChange={(e) => setLang(e.target.value as CommsSettings['defaultLang'])}
          options={(['sw', 'en', 'fr'] as const).map((l) => ({ value: l, label: LANG_LABEL[l] }))}
        />
      </div>
      {saved && <Alert>Saved.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div>
        <SubmitButton
          loading={busy}
          missing={
            [
              !price.trim() && 'Price per segment',
              !cooldown.trim() && 'Days between reminders',
              !floor.trim() && 'Warn when credit falls below',
            ].filter(Boolean) as string[]
          }
          onClick={save}
        >
          Save
        </SubmitButton>
      </div>
    </div>
  );
}

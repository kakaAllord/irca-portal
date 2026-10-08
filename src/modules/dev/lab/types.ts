/** What Dev → Comms lab reads from the API. */

export type LabMode = 'lab' | 'both' | 'live';
export type LabChannel = 'EMAIL' | 'SMS';

export type LabOverview = {
  mode: LabMode;
  /** Whether a message could go out for real right now, per channel. */
  live: { email: boolean; sms: boolean };
  counts: { email: number; sms: number };
  lastAt: string | null;
};

export type LabMessage = {
  id: string;
  channel: LabChannel;
  /** DEV_ONLY: kept here and sent nowhere else. BOTH: kept here and sent for real. */
  route: 'DEV_ONLY' | 'BOTH';
  to: string;
  subject: string | null;
  body: string;
  sender: string | null;
  note: string | null;
  links: string[];
  at: string;
};

export type LabPage = { rows: LabMessage[]; next: string | null };

/** The three places the whole app can send, in the order the switch shows them. */
export const LAB_MODES: { key: LabMode; label: string; says: string }[] = [
  {
    key: 'lab',
    label: 'Dev only',
    says: 'Every email and text is kept here and sent nowhere else, even if accounts are saved.',
  },
  {
    key: 'both',
    label: 'Dev and live',
    says: 'Sent for real where an account is saved, and a copy is kept here. Where none is saved it stays here.',
  },
  {
    key: 'live',
    label: 'Live only',
    says: 'Sent for real and not kept here. Where no account is saved it stays here, so nothing is lost.',
  },
];

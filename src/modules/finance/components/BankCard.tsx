import Image from 'next/image';
import type { ReactNode } from 'react';
import { formatMoney, type CardStyle, type FinanceAccountView, type PaymentMethod } from '@/shared';
import mark from '../../../../public/logo/irca-dark.webp';

/**
 * Each kind of method in its own colours, so the cards read at a glance:
 * cash in banknote green, mobile money in sunset orange, a bank in deep
 * navy, a cheque in ink, a card in black and gold. An account that chose one
 * of the four templates below wears that instead.
 */
type Face = { from: string; via: string; to: string; glow: string };

const FACE: Record<PaymentMethod, Face> = {
  CASH: { from: '#0f3d2e', via: '#17644a', to: '#0c2a22', glow: '#5fd3a0' },
  MOBILE_MONEY: { from: '#7a1f12', via: '#d2552a', to: '#5b1530', glow: '#ffb36b' },
  BANK_TRANSFER: { from: '#0b1736', via: '#1f3f7a', to: '#091027', glow: '#7fb2ff' },
  CHEQUE: { from: '#2a2622', via: '#4a4239', to: '#1b1815', glow: '#e3c99a' },
  CARD: { from: '#111111', via: '#2a2419', to: '#0a0a0a', glow: '#e5b65c' },
  OTHER: { from: '#2d1b4e', via: '#55358f', to: '#1a1030', glow: '#c3a6ff' },
};

/**
 * The four templates an account may choose (Finance → Accounts → Add
 * account), named for what they look like.
 */
export const CARD_STYLE: Record<CardStyle, Face & { name: string }> = {
  FOREST: { name: 'Forest', ...FACE.CASH },
  SUNSET: { name: 'Sunset', ...FACE.MOBILE_MONEY },
  OCEAN: { name: 'Ocean', ...FACE.BANK_TRANSFER },
  ONYX: { name: 'Onyx', ...FACE.CARD },
};

/** The template a new account starts on: the one its method's cards wear. */
export function defaultCardStyle(kind: PaymentMethod | undefined): CardStyle {
  if (kind === 'CASH') return 'FOREST';
  if (kind === 'MOBILE_MONEY') return 'SUNSET';
  if (kind === 'BANK_TRANSFER') return 'OCEAN';
  return 'ONYX';
}

/** A card face's background: a glow in one corner over a three-stop gradient. */
export const faceBackground = (face: Face) =>
  `radial-gradient(120% 90% at 100% 0%, ${face.glow}55 0%, transparent 55%), linear-gradient(135deg, ${face.from} 0%, ${face.via} 55%, ${face.to} 100%)`;

/** "0754123456" as "0754 1234 56", the way a card prints its number. */
const grouped = (n: string) =>
  n
    .replace(/\s+/g, '')
    .match(/.{1,4}/g)
    ?.join(' ') ?? n;

/**
 * An account drawn as a bank card: the church's mark, the method, a chip,
 * the account's number, its name where a cardholder's would be, and what it
 * holds. A card no longer used is greyed and stamped; one that has paid out
 * more than it had shows its balance in red, and the page says why above.
 */
export function BankCard({
  account,
  kind,
  methodName,
  church,
  showCurrency,
  actions,
  compact = false,
}: {
  account: FinanceAccountView;
  kind: PaymentMethod;
  methodName: string;
  church: string;
  showCurrency: boolean;
  /** The card's menu, drawn in its top corner. */
  actions?: ReactNode;
  /** Smaller, for a row of cards: no number, and a smaller balance. */
  compact?: boolean;
}) {
  // A chosen template wins; an account without one wears its method's colours.
  const face = account.cardStyle ? CARD_STYLE[account.cardStyle] : (FACE[kind] ?? FACE.OTHER);
  const negative = account.balance !== null && Number(account.balance) < 0;
  const off = !account.isActive;

  return (
    <div className="group relative">
      <div
        className={`relative isolate flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-[18px] text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-1 ring-black/10 transition-transform duration-300 group-hover:-translate-y-0.5 ${compact ? 'p-4' : 'p-5'} ${off ? 'opacity-60 grayscale' : ''}`}
        style={{
          backgroundImage: faceBackground(face),
        }}
      >
        <Guilloche />
        {/* A sheen across the face, as light catches plastic. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.10)_45%,transparent_55%)]"
        />

        <div className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <Image src={mark} alt="" width={26} height={26} className="size-[26px] rounded-full" />
            <span className="truncate text-[11px] font-semibold tracking-[0.18em] uppercase opacity-90">
              {church}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[10.5px] font-medium tracking-[0.16em] uppercase opacity-80">
              {methodName}
            </span>
            {actions}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Chip />
          {(kind === 'MOBILE_MONEY' || kind === 'CARD') && <Contactless />}
          {account.openRequest && (
            <span className="ml-auto rounded-full bg-[#fcd34d] px-2 py-0.5 text-[10.5px] font-semibold text-[#451a03]">
              Change waiting for approval
            </span>
          )}
        </div>

        {!compact && (
          <p className="font-mono text-[15px] tracking-[0.14em] opacity-90 sm:text-[17px]">
            {account.number ? grouped(account.number) : '•••• •••• ••••'}
          </p>
        )}

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] tracking-[0.18em] uppercase opacity-60">Account</p>
            <p className="truncate text-[13px] font-semibold tracking-wide uppercase">
              {account.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9.5px] tracking-[0.18em] uppercase opacity-60">
              Balance{showCurrency ? ` · ${account.currency}` : ''}
            </p>
            <p
              className={`leading-tight font-semibold tabular-nums ${compact ? 'text-[16px]' : 'text-[19px] sm:text-[21px]'} ${negative ? 'text-[#ffb4a8]' : ''}`}
            >
              {account.balance === null
                ? 'Not open yet'
                : formatMoney(account.balance, account.currency)}
            </p>
          </div>
        </div>

        {off && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[6px] border-2 border-white/80 px-3 py-1 text-[13px] font-bold tracking-[0.2em] uppercase"
          >
            Not in use
          </span>
        )}
      </div>
    </div>
  );
}

/** The fine engraved lines banknotes and cards carry. */
function Guilloche() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 252"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.13]"
    >
      {Array.from({ length: 14 }, (_, i) => (
        <path
          key={i}
          d={`M -20 ${150 + i * 9} C 80 ${60 + i * 9}, 180 ${250 + i * 6}, 420 ${90 + i * 10}`}
          fill="none"
          stroke="white"
          strokeWidth="0.8"
        />
      ))}
      <circle cx="350" cy="40" r="90" fill="none" stroke="white" strokeWidth="0.8" />
      <circle cx="350" cy="40" r="120" fill="none" stroke="white" strokeWidth="0.6" />
    </svg>
  );
}

function Chip() {
  return (
    <svg viewBox="0 0 46 34" className="h-[30px] w-[40px] drop-shadow-sm" aria-hidden="true">
      <defs>
        <linearGradient id="chip-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2a6" />
          <stop offset="0.5" stopColor="#d4a94f" />
          <stop offset="1" stopColor="#a87b2b" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="45" height="33" rx="6" fill="url(#chip-gold)" />
      <g fill="none" stroke="#7a5a1e" strokeWidth="1" opacity="0.7">
        <path d="M0 11h14M0 23h14M32 11h14M32 23h14M14 0v34M32 0v34" />
        <rect x="14" y="8" width="18" height="18" rx="3" />
      </g>
    </svg>
  );
}

function Contactless() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 opacity-80"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M8 8.5a5 5 0 0 1 0 7M11.5 6a9 9 0 0 1 0 12M15 3.5a13 13 0 0 1 0 17"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

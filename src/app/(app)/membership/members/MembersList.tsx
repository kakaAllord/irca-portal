'use client';

import { useState } from 'react';
import { Table, Row, Cell } from '@/components/ui/Table';
import { RowRemind } from '@/modules/membership/components/RemindActions';
import { day, type PersonRow } from '@/modules/membership/types';
import { Expanded } from '../people/MembersTable';

const COLUMNS = 7;

/**
 * The Members table. As on Registrations, a whole row opens in place to show
 * the record, with the way to the full record inside it.
 */
export function MembersList({ rows }: { rows: PersonRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Table head={['No.', 'Member', 'Phone', 'Gender and age', 'Lives in', 'Confirmed', '']}>
      {rows.map((m) => {
        const shown = open === m.id;
        const toggle = () => setOpen(shown ? null : m.id);
        return <MemberRow key={m.id} member={m} shown={shown} onToggle={toggle} />;
      })}
    </Table>
  );
}

function MemberRow({
  member: m,
  shown,
  onToggle,
}: {
  member: PersonRow;
  shown: boolean;
  onToggle: () => void;
}) {
  const name = m.fullName || 'this member';
  return (
    <>
      <Row onClick={onToggle}>
        <Cell className="tabular-nums text-fg2">{m.memberNumber ?? '—'}</Cell>
        <Cell>
          <span className="flex items-center gap-2.5 font-medium text-fg">
            <span
              aria-hidden="true"
              className="flex size-7 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
            >
              {m.initials}
            </span>
            {m.fullName || <span className="text-fg3">Unknown</span>}
          </span>
        </Cell>
        <Cell className="tabular-nums text-fg2">{m.phone || '—'}</Cell>
        <Cell className="text-fg2">
          {[m.gender, m.ageGroup].filter(Boolean).join(' · ') || '—'}
        </Cell>
        <Cell className="text-fg2">{m.livesIn || '—'}</Cell>
        <Cell className="text-fg2">{m.confirmedAt ? day(m.confirmedAt) : '—'}</Cell>
        <Cell nowrap>
          <span className="flex items-center justify-end gap-2">
            {/* A member whose form is not finished can be sent their link (D55).
                The buttons' clicks stay off the row. */}
            {!m.complete && m.hasRegistration && (
              <>
                <span className="text-[11px] text-warn-fg">Form not finished</span>
                <RowRemind personId={m.id} name={m.fullName} />
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-expanded={shown}
              aria-label={shown ? `Close ${name}` : `Open ${name}`}
              className="px-1 text-fg3 hover:text-fg"
            >
              {shown ? '⌄' : '›'}
            </button>
          </span>
        </Cell>
      </Row>
      {shown && (
        <tr className="border-t border-border2 bg-surface2">
          <Cell colSpan={COLUMNS}>
            <Expanded id={m.id} />
          </Cell>
        </tr>
      )}
    </>
  );
}

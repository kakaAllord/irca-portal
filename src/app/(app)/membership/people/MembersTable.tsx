'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/api/client';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Row, Cell } from '@/components/ui/Table';
import { SpiritualPills } from '@/modules/membership/components/SpiritualPills';
import { EnrollDrawer } from '@/modules/membership/components/EnrollDrawer';
import { Button } from '@/components/ui/Button';
import {
  RowRemind,
  TextDrawer,
  useMayRemind,
  type Recipients,
} from '@/modules/membership/components/RemindActions';
import { STAGE_LABEL, day, type PersonDetail, type PersonRow } from '@/modules/membership/types';

/**
 * The Registrations table. A row opens in place, as in the design, and what it
 * shows is fetched then: the record comes from the API with the private parts
 * already left out for anyone who may not read them, so this page never holds
 * a prayer request it should not.
 */
export function MembersTable({ rows, tab }: { rows: PersonRow[]; tab: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const mayRemind = useMayRemind();
  const [chosen, setChosen] = useState<string[]>([]);
  const [texting, setTexting] = useState<Recipients | null>(null);

  // Someone who has not finished the form can be sent their link.
  const unfinished = rows.filter((p) => !p.complete && p.hasRegistration);
  const toggle = (id: string) =>
    setChosen((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const everyoneHere = unfinished.length > 0 && unfinished.every((p) => chosen.includes(p.id));
  const offerAll = tab === 'incomplete' || tab === 'joining';

  return (
    <>
      {mayRemind && (unfinished.length > 0 || offerAll) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[12.5px] text-fg2">
          <span className="mr-auto">
            {chosen.length
              ? `${chosen.length} chosen to be sent their link.`
              : 'Tick people who have not finished the form to text them their link, or text everyone not finished.'}
          </span>
          {unfinished.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setChosen(everyoneHere ? [] : unfinished.map((p) => p.id))}
            >
              {everyoneHere ? 'Untick all' : 'Tick all on this page'}
            </Button>
          )}
          {chosen.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                setTexting({
                  personIds: chosen,
                  names: rows.filter((p) => chosen.includes(p.id)).map((p) => p.fullName),
                })
              }
            >
              Text the {chosen.length} chosen
            </Button>
          )}
          {offerAll && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTexting({ all: true, joining: tab === 'joining' })}
            >
              {tab === 'joining' ? 'Text all joining, not finished' : 'Text everyone not finished'}
            </Button>
          )}
        </div>
      )}
      <Table
        head={[
          ...(mayRemind
            ? [
                <span key="tick" className="sr-only">
                  Choose
                </span>,
              ]
            : []),
          'Name',
          'Phone',
          'Registered',
          'Age',
          'Interested in',
          'Heard via',
          '',
        ]}
      >
        {rows.map((person) => (
          <MemberRows
            key={person.id}
            person={person}
            shown={open === person.id}
            onToggle={() => setOpen(open === person.id ? null : person.id)}
            choosable={mayRemind}
            chosen={chosen.includes(person.id)}
            onChoose={() => toggle(person.id)}
          />
        ))}
      </Table>
      {texting && (
        <TextDrawer
          open
          to={texting}
          onClose={() => setTexting(null)}
          onSent={() => setChosen([])}
        />
      )}
    </>
  );
}

function MemberRows({
  person,
  shown,
  onToggle,
  choosable,
  chosen,
  onChoose,
}: {
  person: PersonRow;
  shown: boolean;
  onToggle: () => void;
  choosable: boolean;
  chosen: boolean;
  onChoose: () => void;
}) {
  const unfinished = !person.complete && person.hasRegistration;
  const flags = [
    person.saved.value && 'Saved',
    person.baptised.value && 'Baptised',
    !person.complete &&
      `Incomplete${person.progress ? ` · ${person.progress.answered} of ${person.progress.of}` : ''}`,
  ].filter(Boolean);

  return (
    <>
      <Row onClick={onToggle}>
        {choosable && (
          <Cell>
            {unfinished && (
              <input
                type="checkbox"
                aria-label={`Choose ${person.fullName || 'this person'} to text their link`}
                checked={chosen}
                onClick={(e) => e.stopPropagation()}
                onChange={onChoose}
                className="size-4 accent-[var(--accent)]"
              />
            )}
          </Cell>
        )}
        <Cell>
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-7 flex-none items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-fg2"
            >
              {person.initials}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-medium text-fg">
                {person.fullName || <span className="text-fg3">Unknown</span>}
              </span>
              {flags.length > 0 && (
                <span className="text-[11px] text-fg3">{flags.join(' · ')}</span>
              )}
            </span>
          </span>
        </Cell>
        <Cell nowrap>
          <span className="tabular-nums text-fg2">{person.phone || '—'}</span>
        </Cell>
        <Cell nowrap>
          <span className="text-fg2">{day(person.registeredAt)}</span>
        </Cell>
        <Cell nowrap>
          <span className="text-fg2">{person.ageGroup || '—'}</span>
        </Cell>
        <Cell>
          <span className="text-fg2">{person.interestedIn.join(', ') || '—'}</span>
        </Cell>
        <Cell>
          <span className="text-fg2">{person.heardVia.join(', ') || '—'}</span>
        </Cell>
        <Cell nowrap>
          {/* An unfinished form can be sent its link from here, in their own
              language (D55). The buttons' clicks stay off the row. */}
          {unfinished && (
            <span className="mr-1 inline-flex">
              <RowRemind personId={person.id} name={person.fullName} />
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={shown}
            aria-label={
              shown
                ? `Close ${person.fullName || 'this person'}`
                : `Open ${person.fullName || 'this person'}`
            }
            className="px-1 text-fg3 hover:text-fg"
          >
            {shown ? '⌄' : '›'}
          </button>
        </Cell>
      </Row>
      {shown && (
        <tr className="border-t border-border2 bg-surface2">
          <Cell colSpan={choosable ? 8 : 7}>
            <Expanded id={person.id} />
          </Cell>
        </tr>
      )}
    </>
  );
}

function Expanded({ id }: { id: string }) {
  const [person, setPerson] = useState<PersonDetail | null>(null);

  useEffect(() => {
    clientApi<PersonDetail>(`/membership/people/${id}`)
      .then(setPerson)
      .catch(() => setPerson(null));
  }, [id]);

  if (!person) {
    return (
      <div className="flex items-center gap-2 py-2 text-[12px] text-fg3">
        <Spinner /> Opening…
      </div>
    );
  }

  const fact = (label: string, value: string) => (
    <div className="flex flex-col">
      <span className="text-[10.5px] font-semibold tracking-wide text-fg3 uppercase">{label}</span>
      <span className="text-[12.5px] text-fg">{value || '—'}</span>
    </div>
  );

  return (
    <div className="grid gap-5 py-2 md:grid-cols-3">
      <section className="flex flex-col gap-2.5">
        <h3 className="text-[12px] font-semibold text-fg">Registration</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {person.sensitive && fact('Email', person.sensitive.email)}
          {fact('Gender', person.gender)}
          {fact('Lives in', person.livesIn)}
          {fact(
            'Occupation',
            [person.occupation.kind, person.occupation.detail].filter(Boolean).join(' · '),
          )}
          {fact('First visit', person.visit.join(', '))}
          {fact('Heard via', person.heardVia.join(', '))}
        </div>
        {!person.complete && (
          <div className="flex items-center gap-2">
            <Badge tone="accent">Did not finish the form</Badge>
          </div>
        )}
      </section>

      {/* Absent, not hidden, for anyone who may not read it. */}
      {person.sensitive && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-semibold text-fg">Prayer request</h3>
          <p className="text-[12.5px] whitespace-pre-line text-fg2">
            {person.sensitive.prayer === undefined
              ? 'Prayer requests are only shown to the pastors.'
              : person.sensitive.prayer || 'None given.'}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[12px] font-semibold text-fg">Spiritual status</h3>
        <SpiritualPills
          personId={person.id}
          saved={person.saved}
          baptised={person.baptised}
          savedBy={person.savedBy}
          baptisedBy={person.baptisedBy}
        />
        <p className="text-[12px] text-fg2">Stage: {STAGE_LABEL[person.stage]}</p>
        <div className="flex flex-wrap gap-2">
          {(person.stage === 'VISITOR' || person.stage === 'NEW_CONVERT') && (
            <EnrollDrawer personId={person.id} name={person.fullName} />
          )}
          <Link
            href={`/membership/people/${person.id}`}
            className="inline-flex h-7 items-center rounded-[7px] px-2.5 text-[11.5px] font-medium text-accent hover:bg-hover"
          >
            Open full record →
          </Link>
        </div>
      </section>
    </div>
  );
}

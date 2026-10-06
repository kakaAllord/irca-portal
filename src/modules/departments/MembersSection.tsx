'use client';

import { useState } from 'react';
import { Can } from '@/lib/session';
import { EmptyState } from '@/components/shell/States';
import { Input } from '@/components/ui/Input';
import { Table, Row, Cell } from '@/components/ui/Table';
import { ViewAsButton } from '@/components/shell/ViewAsButton';
import { STAGE_LABEL } from '../membership/types';
import { AddMemberDrawer } from './AddMemberDrawer';
import { EndButton } from './EndButton';
import { ACCOUNT_STATUS, since, type DepartmentDetail } from './types';

/**
 * A department's members, with adding and removing for whoever may keep them:
 * its leaders (`departments.own.members`) or an administrator
 * (`admin.departments.manage`). The page says which, since the same list
 * serves both. A department with a portal is kept by an administrator only
 * (D31), so its leaders see the list and a word about who adds to it. The
 * pastors and administrators overseeing a department see it `readOnly`.
 */
export function MembersSection({
  department,
  permission,
  readOnly = false,
}: {
  department: DepartmentDetail;
  permission: string;
  readOnly?: boolean;
}) {
  const [q, setQ] = useState('');
  const leadersPage = permission === 'departments.own.members';
  const editable = !readOnly && !department.archived && !(leadersPage && department.portal);
  // A long list gets a search; a short one reads faster without.
  const searchable = department.members.length > 20;
  const shown = q.trim()
    ? department.members.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
    : department.members;
  const admin = permission === 'admin.departments.manage';
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-fg">
          Members <span className="font-normal text-fg3">· {department.members.length}</span>
        </h2>
        {editable && (
          <Can permission={permission}>
            <AddMemberDrawer
              departmentId={department.id}
              name={department.name}
              portal={department.portal !== null}
            />
          </Can>
        )}
      </div>
      {searchable && (
        <Input
          label="Search"
          placeholder={`Search ${department.members.length} members…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      {leadersPage && !readOnly && department.portal && (
        <p className="text-[12px] text-fg3">
          An administrator adds and removes the members of {department.name}, because being in it
          opens its portal.
        </p>
      )}
      {department.members.length === 0 ? (
        <EmptyState title="Nobody in it yet">
          {department.portal
            ? "An administrator adds its members from the church's People list."
            : "Its leaders add members from the church's People list."}
        </EmptyState>
      ) : (
        <Table head={['Name', 'In it since', '']}>
          {shown.map((m) => (
            <Row key={m.id}>
              <Cell>
                {/* One column on a phone, where leaders mostly are: the stage and
                    the end of the number sit under the name. */}
                <span className="flex flex-col">
                  <span className="font-medium text-fg">{m.name}</span>
                  <span className="text-[11.5px] text-fg3">
                    {[
                      STAGE_LABEL[m.stage],
                      m.phone ?? (m.phoneTail && `phone ${m.phoneTail}`),
                      admin &&
                        department.portal &&
                        (m.account ? ACCOUNT_STATUS[m.account.status] : 'no account'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </Cell>
              <Cell nowrap>
                <span className="text-fg2">{since(m.since)}</span>
              </Cell>
              <Cell nowrap>
                <span className="flex items-center justify-end gap-2">
                  {m.canViewAs && m.userId && <ViewAsButton userId={m.userId} name={m.name} />}
                  {editable && (
                    <Can permission={permission}>
                      <EndButton
                        label="Remove"
                        question={`Take ${m.name} out of ${department.name}?`}
                        explanation="They stop getting the department's messages. The record that they were in it is kept."
                        confirm="Take them out"
                        path={`/departments/${department.id}/members/${m.id}/end`}
                      />
                    </Can>
                  )}
                </span>
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </section>
  );
}

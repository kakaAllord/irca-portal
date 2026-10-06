'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ACCOUNT_KINDS, type AccountKindKey } from '@/shared';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { KindChoice } from '../KindChoice';

/**
 * What someone is (D30), and where they are: their kinds, which an
 * administrator changes here, and their departments, which are changed in
 * Departments. Roles are the engine underneath and not shown (D43).
 */
export function KindEditor({
  userId,
  kinds,
  places,
  otherRoles,
  canEdit,
}: {
  userId: string;
  kinds: AccountKindKey[];
  places: string[];
  otherRoles: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(kinds.filter((k) => !ACCOUNT_KINDS[k].cliOnly));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    const nothing = !kinds.length && !places.length && !otherRoles.length;
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        {nothing ? (
          <p className="text-[12.5px] text-fg3">
            Nothing yet: no kind, and in no department with a portal, so they see nothing.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-[12.5px]">
            {kinds.map((k) => (
              <li key={k}>
                <span className="font-medium text-fg">{ACCOUNT_KINDS[k].label}</span>
                <span className="block text-[11.5px] text-fg3">{ACCOUNT_KINDS[k].description}</span>
              </li>
            ))}
            {otherRoles.map((name) => (
              <li key={name} className="text-fg2">
                {name} <span className="text-fg3">(an older role)</span>
              </li>
            ))}
            {places.map((place) => (
              <li key={place} className="text-fg2">
                {place.charAt(0).toUpperCase() + place.slice(1)}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <KindChoice value={value} onChange={setValue} />
      <p className="text-[11.5px] text-fg3">
        Leaders and members of departments are changed in Departments.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await clientApi(`/admin/users/${userId}/kinds`, {
                method: 'PUT',
                body: { kinds: value },
              });
              setEditing(false);
              router.refresh();
            } catch (err) {
              setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setValue(kinds.filter((k) => !ACCOUNT_KINDS[k].cliOnly));
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

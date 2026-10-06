'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import { EmptyState } from '@/components/shell/States';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Table, Row, Cell } from '@/components/ui/Table';
import type { Position } from './types';

/**
 * The positions leaders hold, in the order leaders are listed everywhere
 * (docs/plan/14, step 14.1). Renamed, a position is renamed for everyone
 * holding it; turned off, it is no longer offered but stays on its holders.
 * Nothing here deletes one.
 */
export function PositionsManager({
  positions: initial,
  canManage,
}: {
  positions: Position[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [positions, setPositions] = useState(initial);
  const [editing, setEditing] = useState<Position | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function move(index: number, by: -1 | 1) {
    const next = [...positions];
    const [moved] = next.splice(index, 1);
    next.splice(index + by, 0, moved!);
    setPositions(next);
    setError(null);
    setBusy(moved!.id);
    try {
      await clientApi('/admin/leader-positions/order', {
        method: 'PUT',
        body: { ids: next.map((p) => p.id) },
      });
      router.refresh();
    } catch (err) {
      setPositions(positions);
      setError(err instanceof ApiRequestError ? err.message : 'Could not change the order.');
    } finally {
      setBusy(null);
    }
  }

  async function setActive(position: Position, active: boolean) {
    setError(null);
    setBusy(position.id);
    try {
      await clientApi(`/admin/leader-positions/${position.id}/active`, {
        method: 'PUT',
        body: { active },
      });
      setPositions((all) => all.map((p) => (p.id === position.id ? { ...p, active } : p)));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not change it.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-fg2">
          Offered when a leader is named, in this order. Leaders are listed in it everywhere.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing('new')}>
            + Add position
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {positions.length === 0 ? (
        <EmptyState title="No positions yet">Add the posts your departments have.</EmptyState>
      ) : (
        <Table head={['Position', 'Held by', '', ...(canManage ? [''] : [])]}>
          {positions.map((p, i) => (
            <Row key={p.id}>
              <Cell>
                <span className="font-medium text-fg">{p.name}</span>
              </Cell>
              <Cell nowrap>
                <span className="text-fg2">
                  {p.holders === 0
                    ? 'Nobody now'
                    : `${p.holders} leader${p.holders === 1 ? '' : 's'}`}
                </span>
              </Cell>
              <Cell nowrap>{!p.active && <Badge tone="muted">Turned off</Badge>}</Cell>
              {canManage && (
                <Cell nowrap>
                  <span className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${p.name} up`}
                      disabled={i === 0 || busy !== null}
                      onClick={() => void move(i, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${p.name} down`}
                      disabled={i === positions.length - 1 || busy !== null}
                      onClick={() => void move(i, 1)}
                    >
                      ↓
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === p.id}
                      onClick={() => void setActive(p, !p.active)}
                    >
                      {p.active ? 'Turn off' : 'Turn on'}
                    </Button>
                  </span>
                </Cell>
              )}
            </Row>
          ))}
        </Table>
      )}

      <NameDialog
        position={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setPositions((all) =>
            all.some((p) => p.id === saved.id)
              ? all.map((p) => (p.id === saved.id ? { ...p, name: saved.name } : p))
              : [...all, { ...saved, sortOrder: all.length + 1, active: true, holders: 0 }],
          );
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

/** Adding a position, or renaming one: the same name box, and the same checks. */
function NameDialog({
  position,
  onClose,
  onSaved,
}: {
  position: Position | 'new' | null;
  onClose: () => void;
  onSaved: (saved: { id: string; name: string }) => void;
}) {
  const existing = position && position !== 'new' ? position : null;
  const [name, setName] = useState('');
  const [similar, setSimilar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<typeof position>(null);

  // A fresh box each time it opens, holding the current name when renaming.
  if (position !== openedFor) {
    setOpenedFor(position);
    setName(existing?.name ?? '');
    setSimilar(null);
    setError(null);
  }

  async function save(confirmDistinct = false) {
    setBusy(true);
    setError(null);
    try {
      const body = { name, confirmDistinct };
      if (existing) {
        await clientApi(`/admin/leader-positions/${existing.id}`, { method: 'PUT', body });
        onSaved({ id: existing.id, name: name.trim().replace(/\s+/g, ' ') });
      } else {
        onSaved(
          await clientApi<{ id: string; name: string }>('/admin/leader-positions', {
            method: 'POST',
            body,
          }),
        );
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'SIMILAR_EXISTS') {
        setSimilar(err.message);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={position !== null}
      onClose={onClose}
      title={existing ? `Rename ${existing.name}` : 'Add a position'}
      description={
        existing && existing.holders > 0
          ? `The new name shows for the ${existing.holders === 1 ? 'leader' : `${existing.holders} leaders`} holding it.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {similar ? (
            <Button loading={busy} onClick={() => void save(true)}>
              Yes, it is different
            </Button>
          ) : (
            <Button loading={busy} disabled={name.trim().length < 2} onClick={() => void save()}>
              {existing ? 'Rename' : 'Add'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Name"
          required
          maxLength={60}
          placeholder="Treasurer"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSimilar(null);
          }}
        />
        {similar && <Alert>{similar} If not, say it is a different position.</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Dialog>
  );
}

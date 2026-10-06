'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { NavItem } from '@/shared';
import { useMe } from '@/lib/session';
import { Logo } from '@/components/Logo';
import { NavIcon } from './NavIcon';
import { cn } from '@/lib/cn';
import { UserMenu } from './UserMenu';

/** The active page is the longest link that the current path starts with. */
function useActiveHref(hrefs: string[]): string | null {
  const pathname = usePathname();
  return (
    hrefs
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}

export function Sidebar({
  collapsedInitially,
  onNavigate,
}: {
  collapsedInitially: boolean;
  onNavigate?: () => void;
}) {
  const me = useMe();
  const [collapsed, setCollapsed] = useState(collapsedInitially);
  const active = useActiveHref([
    ...me.modules.flatMap((m) => m.nav.map((n) => n.href)),
    ...(me.departments ?? []).map((d) => `/departments/${d.id}`),
  ]);

  function toggle(next: boolean) {
    setCollapsed(next);
    document.cookie = `irca_sidebar=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <nav
      aria-label="Portals"
      className={cn(
        'flex h-full flex-col gap-1 border-r border-border bg-sidebar p-2.5',
        collapsed ? 'w-16' : 'w-[218px]',
        me.impersonation && 'border-t-[3px] border-t-warn-br',
      )}
    >
      <div className={cn('flex items-center gap-2.5 px-1.5 py-2', collapsed && 'justify-center')}>
        {collapsed ? (
          // Collapsed, the logo is the way back open: there is no room for a second button.
          <button
            type="button"
            onClick={() => toggle(false)}
            aria-label="Expand the sidebar"
            title="Expand the sidebar"
            className="rounded-[7px] hover:opacity-80"
          >
            <Logo size={28} />
          </button>
        ) : (
          <>
            <Logo size={28} />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[12.5px] font-semibold text-fg">
                {me.church?.code ?? 'IRCA'}
              </span>
              {me.church && <span className="truncate text-[11px] text-fg3">{me.church.name}</span>}
            </span>
            {/* The phone drawer closes by tapping beside it, so it has nothing to collapse. */}
            {!onNavigate && (
              <button
                type="button"
                onClick={() => toggle(true)}
                aria-label="Collapse the sidebar"
                title="Collapse the sidebar"
                className="flex size-7 flex-none items-center justify-center rounded-[7px] text-fg3 hover:bg-hover hover:text-fg"
              >
                <CollapseIcon />
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pt-2">
        {me.modules.map((module) => (
          <div key={module.key} className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10.5px] font-semibold tracking-wide text-fg3 uppercase">
                {module.name}
              </p>
            )}
            {module.nav.map((item) =>
              item.children === 'departments' ? (
                <DepartmentsNav
                  key={item.href}
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ) : (
                <NavLink
                  key={item.href}
                  item={item}
                  on={item.href === active}
                  collapsed={collapsed}
                  badge={me.badges[item.href]}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <UserMenu collapsed={collapsed} />
    </nav>
  );
}

function NavLink({
  item,
  on,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  on: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={on ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[12.5px] font-medium',
        on ? 'bg-surface text-fg shadow-sm' : 'text-fg2 hover:bg-hover hover:text-fg',
      )}
    >
      <NavBox icon={item.icon} on={on} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {/* Something waiting should be visible without opening the page. */}
      {badge ? (
        <span
          className="ml-auto flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-accent-ink"
          aria-label={`${badge} waiting`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavBox({ icon, on }: { icon: NavItem['icon']; on: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[22px] flex-none items-center justify-center rounded-[6px] border',
        on ? 'border-accent bg-accent text-accent-ink' : 'border-border text-fg3',
      )}
    >
      <NavIcon name={icon} />
    </span>
  );
}

/**
 * Departments, for the pastors and administrators who oversee them (14.2): a
 * chevron opens every department by name under the item. Collapsed, the icon
 * opens the same list beside the sidebar. The list comes with the session,
 * so opening it asks the server nothing.
 */
function DepartmentsNav({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const me = useMe();
  const departments = me.departments ?? [];
  const hrefOf = (id: string) => `/departments/${id}`;
  const inside = departments.some((d) => hrefOf(d.id) === active);
  const [open, setOpen] = useState(inside);
  // Where the flyout opens: beside the button, fixed to the window, since the
  // sidebar's scrolling list would clip anything reaching out of it.
  const [flyout, setFlyout] = useState<{ top: number; left: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // The flyout closes on a click anywhere else, and on Escape.
  useEffect(() => {
    if (!flyout) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setFlyout(null);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setFlyout(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [flyout]);

  const list = (
    <ul className="flex flex-col gap-0.5">
      {departments.map((d) => {
        const on = hrefOf(d.id) === active;
        return (
          <li key={d.id}>
            <Link
              href={hrefOf(d.id)}
              onClick={() => {
                setFlyout(null);
                onNavigate?.();
              }}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'block truncate rounded-[7px] px-2 py-1 text-[12.5px]',
                on
                  ? 'bg-surface font-medium text-fg shadow-sm'
                  : 'text-fg2 hover:bg-hover hover:text-fg',
              )}
            >
              {d.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (collapsed) {
    return (
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={(e) => {
            const at = e.currentTarget.getBoundingClientRect();
            setFlyout((f) => (f ? null : { top: at.top, left: at.right + 8 }));
          }}
          aria-expanded={flyout !== null}
          title={item.label}
          aria-label={item.label}
          className={cn(
            'flex w-full items-center rounded-[8px] px-2 py-1.5',
            inside ? 'bg-surface shadow-sm' : 'hover:bg-hover',
          )}
        >
          <NavBox icon={item.icon} on={inside} />
        </button>
        {flyout && (
          <div
            style={{ top: flyout.top, left: flyout.left }}
            className="fixed z-40 max-h-[70vh] w-56 overflow-y-auto rounded-[10px] border border-border bg-surface p-1.5 shadow-lg"
          >
            <p className="px-2 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-wide text-fg3 uppercase">
              {item.label}
            </p>
            {list}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <NavLink item={item} on={item.href === active} collapsed={false} onNavigate={onNavigate} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Hide the departments' : 'Show the departments'}
          className="flex size-7 flex-none items-center justify-center rounded-[7px] text-fg3 hover:bg-hover hover:text-fg"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={cn('size-[14px] transition-transform', open && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && <div className="ml-[30px] border-l border-border2 pl-1.5">{list}</div>}
    </div>
  );
}

/** A panel with its edge drawn in, and an arrow pointing to close it. */
function CollapseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15M15.5 9.5 13 12l2.5 2.5" />
    </svg>
  );
}

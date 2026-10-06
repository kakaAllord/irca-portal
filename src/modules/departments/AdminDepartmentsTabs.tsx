'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** Admin → Departments: the departments themselves, and the positions their leaders hold. */
export function AdminDepartmentsTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/departments', label: 'Departments' },
    { href: '/admin/departments/positions', label: 'Positions' },
  ];
  return (
    <nav
      aria-label="Departments"
      className="mb-5 flex gap-1 overflow-x-auto border-b border-border"
    >
      {tabs.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium whitespace-nowrap',
              on
                ? 'border-accent text-fg'
                : 'border-transparent text-fg3 hover:border-border hover:text-fg2',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

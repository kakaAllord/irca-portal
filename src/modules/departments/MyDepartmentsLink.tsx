import Link from 'next/link';
import { serverApi } from '@/lib/api/server';
import type { MyDepartment } from './types';

/**
 * The way back to My departments, for someone leading more than one. A
 * leader of a single department is taken straight to it from that list, so
 * for them the link would only lead back to the page they are on.
 */
export async function MyDepartmentsLink() {
  // Someone overseeing rather than leading has no list of their own to go back to.
  const mine = await serverApi<MyDepartment[]>('/departments/mine').catch(() => []);
  if (mine.length < 2) return null;
  return (
    <Link href="/departments" className="text-[12px] text-fg2 hover:text-fg">
      ← My departments
    </Link>
  );
}

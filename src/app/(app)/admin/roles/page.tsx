import { redirect } from 'next/navigation';

/**
 * Roles left Admin with D43: they are the developer's business, read on Dev
 * → Access. An old bookmark lands on the Overview instead of a missing page.
 */
export default function RolesMoved() {
  redirect('/admin');
}

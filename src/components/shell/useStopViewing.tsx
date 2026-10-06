'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api/client';

/**
 * Ends viewing as someone and goes back to the page it was started from,
 * which the arrow that started it kept in `irca_return_to`. The viewing bar
 * and the foot of the sidebar both use it, so there is one way back.
 */
export function useStopViewing() {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  async function stop() {
    setStopping(true);
    await clientApi('/impersonation', { method: 'DELETE' }).catch(() => undefined);
    const back = sessionStorage.getItem('irca_return_to');
    sessionStorage.removeItem('irca_return_to');
    router.replace(back && back.startsWith('/') ? back : '/');
    router.refresh();
  }

  return { stop, stopping };
}

/** An arrow going into a box: back into your own view. The pair of the view-as arrow. */
export function BackIcon({ className = 'size-[15px]' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 13H5v-6" />
      <path d="m5 13 9-9" />
      <path d="M14 20h5a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-5" />
    </svg>
  );
}

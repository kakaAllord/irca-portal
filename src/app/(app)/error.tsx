'use client';

import { Button } from '@/components/ui/Button';
import {
  ErrorReference,
  useErrorReference,
  type BoundaryError,
} from '@/components/shell/ErrorReference';

/**
 * Something went wrong on a page. The reference is what the developer looks
 * up in Dev → Errors (docs/plan/11, step 11.4).
 */
export default function PageError({ error, retry }: { error: BoundaryError; retry: () => void }) {
  const { reference, where } = useErrorReference(error);
  return (
    <div className="mx-auto max-w-md rounded-[12px] border border-danger-br bg-danger-bg p-7 text-center">
      <h1 className="text-[16px] font-semibold text-danger">Something went wrong</h1>
      <ErrorReference reference={reference} where={where} />
      <Button className="mt-4" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

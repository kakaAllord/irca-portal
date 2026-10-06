'use client';

import './globals.css';
import {
  ErrorReference,
  useErrorReference,
  type BoundaryError,
} from '@/components/shell/ErrorReference';

/**
 * When even the frame around every page failed. It replaces the root layout,
 * so it brings its own document and styles, and follows the device's colours
 * because the theme the person chose is read by the layout that failed.
 */
export default function GlobalError({ error, retry }: { error: BoundaryError; retry: () => void }) {
  const { reference, where } = useErrorReference(error);
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center p-6 text-[13px]">
        <title>Something went wrong · IRCA Admin</title>
        <div className="mx-auto max-w-md rounded-[12px] border border-danger-br bg-danger-bg p-7 text-center">
          <h1 className="text-[16px] font-semibold text-danger">Something went wrong</h1>
          <ErrorReference reference={reference} where={where} />
          <button
            type="button"
            onClick={retry}
            className="mt-4 h-8 rounded-[7px] bg-fg px-3 text-[12.5px] font-medium text-bg"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

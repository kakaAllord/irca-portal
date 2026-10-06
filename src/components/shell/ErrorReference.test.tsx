import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ApiRequestError } from '@/lib/api/errors';
import { ErrorReference, useErrorReference, type BoundaryError } from './ErrorReference';

function Page({ error }: { error: BoundaryError }) {
  const { reference, where } = useErrorReference(error);
  return <ErrorReference reference={reference} where={where} />;
}

const apiError = (status: number) =>
  new ApiRequestError(status, {
    error: { code: status >= 500 ? 'INTERNAL' : 'FORBIDDEN', message: 'No' },
    requestId: '0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000',
  });

describe('the reference an error page shows', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  const stubFetch = () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it("shows the server's digest, which the server already sent", () => {
    const fetch = stubFetch();
    render(<Page error={Object.assign(new Error('x'), { digest: '2276771245' })} />);
    expect(screen.getByLabelText('Reference').textContent).toBe('2276771245');
    expect(screen.getByText('The server could not build this page.')).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the API's request id for a failure it keeps itself", () => {
    const fetch = stubFetch();
    render(<Page error={apiError(500)} />);
    expect(screen.getByLabelText('Reference').textContent).toBe(
      '0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends an answer the API did not keep, under its request id', () => {
    const fetch = stubFetch();
    render(<Page error={apiError(403)} />);
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      source: 'browser',
      reference: '0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000',
      requestId: '0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000',
      status: 403,
    });
  });

  it('makes up a reference for a failure in the browser, and sends it once', () => {
    const fetch = stubFetch();
    const error = new TypeError("Cannot read properties of undefined (reading 'id')");
    const { rerender } = render(<Page error={error} />);
    rerender(<Page error={error} />);
    const shown = screen.getByLabelText('Reference').textContent!;
    expect(shown).toMatch(/^B\d{10}$/);
    expect(screen.getByText('The page stopped working in your browser.')).toBeDefined();
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string)).toMatchObject({
      source: 'browser',
      reference: shown,
      message: "TypeError: Cannot read properties of undefined (reading 'id')",
    });
  });
});

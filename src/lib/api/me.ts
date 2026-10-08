import 'server-only';
import { cache } from 'react';
import type { MeResponse } from '@/shared';
import { serverApi } from './server';

/**
 * Who is signed in, asked of the API once per page render. The frame and the
 * page both need it, and each used to ask on its own: two calls, and the page's
 * data waited behind the second. React remembers the first answer for the rest
 * of the same request, and forgets it when the request ends, so nothing is
 * shared between visitors.
 */
export const getMe = cache((): Promise<MeResponse> => serverApi<MeResponse>('/auth/me'));

import { describe, expect, it } from 'vitest';
import { ended, howLong } from './format';

describe('the view-as log, written down', () => {
  it('says how long in a unit that fits', () => {
    expect(howLong(47)).toBe('47s');
    expect(howLong(720)).toBe('12m');
    expect(howLong(3900)).toBe('1h05');
    expect(howLong(null)).toBe('still open');
  });

  it('says why a session ended in words', () => {
    expect(ended({ endedAt: null, endReason: null })).toBe('Still open');
    expect(ended({ endedAt: '2026-09-21T09:12:00Z', endReason: 'STOPPED' })).toBe('Came back');
    expect(ended({ endedAt: '2026-09-21T09:12:00Z', endReason: 'EXPIRED' })).toBe(
      'Ran out of time',
    );
  });
});

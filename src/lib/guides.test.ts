import { describe, expect, it } from 'vitest';
import { guideForPath, guidesFor } from './guides';

const FINANCE = ['finance.transactions.read', 'finance.overview.read'];
const PASTOR = ['membership.people.read', 'membership.prayers.read', 'departments.all.read'];
const LEADER = ['departments.own.read', 'comms.department.send'];

describe('guidesFor', () => {
  it('gives each person only the guides for what they use', () => {
    expect(guidesFor(FINANCE).map((g) => g.href)).toEqual([
      '/help/getting-started',
      '/help/finance',
    ]);
    expect(guidesFor(['comms.messages.send']).map((g) => g.href)).not.toContain('/help/finance');
    expect(guidesFor(PASTOR).map((g) => g.href)).toEqual([
      '/help/getting-started',
      '/help/pastors',
      '/help/membership',
    ]);
  });
});

describe('guideForPath', () => {
  it('opens the guide for the portal the page is in', () => {
    expect(guideForPath('/finance', FINANCE)?.href).toBe('/help/finance');
    expect(guideForPath('/finance/transactions/new', FINANCE)?.href).toBe('/help/finance');
  });

  it('opens the closest match, and only among your own guides', () => {
    expect(guideForPath('/membership/prayers', PASTOR)?.href).toBe('/help/pastors');
    expect(guideForPath('/membership/people', PASTOR)?.href).toBe('/help/membership');
    expect(guideForPath('/departments/abc', PASTOR)?.href).toBe('/help/pastors');
    expect(guideForPath('/departments/abc', LEADER)?.href).toBe('/help/leading');
    expect(guideForPath('/finance', ['comms.messages.send'])).toBeNull();
  });

  it('does not match a portal whose name only starts the same', () => {
    expect(guideForPath('/financeX', FINANCE)).toBeNull();
  });
});

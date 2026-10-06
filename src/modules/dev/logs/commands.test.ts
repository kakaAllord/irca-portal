import { describe, expect, it } from 'vitest';
import { parseLogsCommand } from './commands';

describe('the Logs command line', () => {
  it('tails fifty lines unless told how many, and refuses nonsense', () => {
    expect(parseLogsCommand('tail')).toEqual({ name: 'tail', lines: 50 });
    expect(parseLogsCommand('tail 200')).toEqual({ name: 'tail', lines: 200 });
    expect(parseLogsCommand('tail many')).toMatchObject({ name: 'error' });
    expect(parseLogsCommand('tail 9000')).toMatchObject({ name: 'error' });
  });

  it('follows, and stops', () => {
    expect(parseLogsCommand('follow')).toEqual({ name: 'follow' });
    expect(parseLogsCommand('stop')).toEqual({ name: 'stop' });
  });

  it('sets a level, or all of them', () => {
    expect(parseLogsCommand('level warn')).toEqual({ name: 'level', level: 'warn' });
    expect(parseLogsCommand('level ALL')).toEqual({ name: 'level', level: null });
    expect(parseLogsCommand('level loud')).toMatchObject({ name: 'error' });
  });

  it('greps for everything after the word, quotes or not', () => {
    expect(parseLogsCommand('grep /v1/comms schedules')).toEqual({
      name: 'grep',
      text: '/v1/comms schedules',
    });
    expect(parseLogsCommand('grep "does not exist"')).toEqual({
      name: 'grep',
      text: 'does not exist',
    });
    expect(parseLogsCommand('grep')).toMatchObject({ name: 'error' });
  });

  it('takes a request id, or the start of one, and nothing else', () => {
    expect(parseLogsCommand('req 811884C3')).toEqual({ name: 'req', id: '811884c3' });
    expect(parseLogsCommand('req ../etc')).toMatchObject({ name: 'error' });
    expect(parseLogsCommand('req')).toMatchObject({ name: 'error' });
  });

  it('takes an email for user', () => {
    expect(parseLogsCommand('user Clerk@IRCA.local')).toEqual({
      name: 'user',
      email: 'clerk@irca.local',
    });
    expect(parseLogsCommand('user clerk')).toMatchObject({ name: 'error' });
  });

  it('reads the action filters, and says which flag it does not know', () => {
    expect(parseLogsCommand('actions --since=1h --user="Neema Mollel" --action=finance.')).toEqual({
      name: 'actions',
      since: '1h',
      user: 'Neema Mollel',
      action: 'finance.',
      limit: 50,
    });
    const wrong = parseLogsCommand('actions --wherever=irca');
    expect(wrong).toMatchObject({ name: 'error' });
    expect((wrong as { message: string }).message).toContain('--wherever');
    expect(parseLogsCommand('actions --since=yesterday')).toMatchObject({ name: 'error' });
    expect(parseLogsCommand('actions irca')).toMatchObject({ name: 'error' });
    expect(parseLogsCommand('actions --limit=500')).toMatchObject({ name: 'error' });
  });

  it('looks up a reference, however much of the sentence came with it', () => {
    expect(parseLogsCommand('ref 2276771245')).toEqual({ name: 'ref', reference: '2276771245' });
    expect(parseLogsCommand('ref tell your developer: 2276771245')).toEqual({
      name: 'ref',
      reference: 'tell your developer: 2276771245',
    });
    expect(parseLogsCommand('ref')).toMatchObject({ name: 'error' });
  });

  it('names what it does not know', () => {
    expect(parseLogsCommand('sudo rm -rf')).toMatchObject({ name: 'error' });
    expect(parseLogsCommand('  ')).toEqual({ name: 'error', message: '' });
  });
});

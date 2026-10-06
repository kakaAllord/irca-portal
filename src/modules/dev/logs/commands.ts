import { isMoment, readFlags, tokenize, wholeNumber } from '../terminal/parse';

/**
 * Dev → Logs, read by typing (docs/plan/11, step 11.6). The owner asked for
 * the terminal here: the server log and what people did are searched, not
 * browsed, and a command can be pasted into a message.
 */
export type Level = 'error' | 'warn' | 'info' | 'debug';

export type LogsCommand =
  | { name: 'help' }
  | { name: 'tail'; lines: number }
  | { name: 'follow' }
  | { name: 'stop' }
  | { name: 'level'; level: Level | null }
  | { name: 'grep'; text: string }
  | { name: 'req'; id: string }
  | { name: 'user'; email: string }
  | {
      name: 'actions';
      since?: string;
      user?: string;
      action?: string;
      limit: number;
    }
  | { name: 'ref'; reference: string }
  | { name: 'clear' }
  | { name: 'error'; message: string };

const LEVELS: Level[] = ['error', 'warn', 'info', 'debug'];

export const HELP = [
  'tail [n]              the last n lines the server wrote (50 unless you say)',
  'follow                watch new lines arrive; "stop" or Escape ends it',
  'level <error|warn|info|debug|all>',
  '                      show only lines this serious or worse, from now on',
  'grep <text>           lines that mention it: a path, a message, an id',
  'req <request-id>      every line one request wrote',
  'user <email>          lines from requests one person made',
  'actions [--since=1h] [--user=text] [--action=finance.] [--limit=n]',
  '                      what people did, newest first',
  'ref <reference>       what went wrong behind a reference someone was shown',
  'clear                 empty the screen',
  'help                  this',
  '',
  'Times: 30m, 24h, 7d or a date such as 2026-09-01. The server holds only its',
  'latest few thousand lines, and starts empty when it restarts.',
];

/** A line of typing into one command, or an error saying what was wrong with it. */
export function parseLogsCommand(line: string): LogsCommand {
  const [name, ...rest] = tokenize(line.trim());
  if (!name) return { name: 'error', message: '' };

  switch (name.toLowerCase()) {
    case 'help':
    case '?':
      return { name: 'help' };
    case 'tail': {
      if (rest.length > 1) return { name: 'error', message: 'tail takes one number: tail 100.' };
      const lines = rest[0] === undefined ? 50 : wholeNumber(rest[0], 1, 1000);
      if (lines === null) {
        return { name: 'error', message: 'tail takes a whole number from 1 to 1000.' };
      }
      return { name: 'tail', lines };
    }
    case 'follow':
    case 'tail-f':
      return { name: 'follow' };
    case 'stop':
      return { name: 'stop' };
    case 'level': {
      const level = rest[0]?.toLowerCase();
      if (level === 'all') return { name: 'level', level: null };
      if (!level || !LEVELS.includes(level as Level)) {
        return { name: 'error', message: 'level takes error, warn, info, debug or all.' };
      }
      return { name: 'level', level: level as Level };
    }
    case 'grep':
    case 'search': {
      const text = rest.join(' ').trim();
      if (!text) return { name: 'error', message: 'grep needs something to look for.' };
      if (text.length > 120) return { name: 'error', message: 'That is too long to look for.' };
      return { name: 'grep', text };
    }
    case 'req': {
      const id = rest[0]?.toLowerCase();
      if (!id || !/^[0-9a-f-]{8,36}$/.test(id)) {
        return { name: 'error', message: 'req needs a request id: req 811884c3-27fc-….' };
      }
      return { name: 'req', id };
    }
    case 'user': {
      const email = rest[0]?.toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
        return { name: 'error', message: 'user needs an email: user clerk@irca.local.' };
      }
      return { name: 'user', email };
    }
    case 'actions': {
      const { flags, loose, error } = readFlags(rest, ['since', 'user', 'action', 'limit']);
      if (error) return { name: 'error', message: error };
      if (loose.length) return { name: 'error', message: `I don't understand "${loose[0]}".` };
      if (flags.since && !isMoment(flags.since)) {
        return { name: 'error', message: '--since takes 30m, 24h, 7d or a date.' };
      }
      const limit = flags.limit === undefined ? 50 : wholeNumber(flags.limit, 1, 200);
      if (limit === null) {
        return { name: 'error', message: '--limit takes a whole number from 1 to 200.' };
      }
      return {
        name: 'actions',
        limit,
        ...(flags.since ? { since: flags.since } : {}),
        ...(flags.user ? { user: flags.user } : {}),
        ...(flags.action ? { action: flags.action } : {}),
      };
    }
    case 'ref': {
      const reference = rest.join(' ').trim();
      if (!reference) return { name: 'error', message: 'ref needs the reference: ref 2276771245.' };
      return { name: 'ref', reference };
    }
    case 'clear':
    case 'cls':
      return { name: 'clear' };
    default:
      return { name: 'error', message: `"${name}" is not a command. Type help.` };
  }
}

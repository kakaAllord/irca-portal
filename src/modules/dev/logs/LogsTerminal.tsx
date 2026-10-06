'use client';

import { useMemo, useRef } from 'react';
import { clientApi } from '@/lib/api/client';
import { Terminal, type Line, type Outcome, type Program } from '../terminal/Terminal';
import type { ErrorLookup } from '../types';
import { HELP, parseLogsCommand, type Level } from './commands';
import { actionLine, clock, serverLine, type ActionRow, type ServerLogs } from './format';

const WELCOME: Line[] = [
  { text: 'The server log, and what people did. Type help to see what you can ask.', tone: 'dim' },
  { text: 'Start with: tail, follow, or ref <the reference someone sent you>', tone: 'dim' },
];

/**
 * Dev → Logs as a terminal (docs/plan/11, step 11.6): the server's recent
 * lines, the activity log, and the error lookup, each a command. The level
 * set with `level` stays until it is changed, for tail, follow and grep alike.
 */
export function LogsTerminal({ timezone }: { timezone: string }) {
  const level = useRef<Level | null>(null);

  const program = useMemo<Program>(() => {
    const server = async (params: Record<string, string>) => {
      const query = new URLSearchParams(params);
      if (level.current) query.set('level', level.current);
      return clientApi<ServerLogs>(`/dev/logs/server?${query}`);
    };
    // Oldest first on the screen, as a terminal prints them.
    const print = (logs: ServerLogs, empty: string): Line[] =>
      logs.lines.length
        ? [...logs.lines].reverse().map((l) => serverLine(l, timezone))
        : [{ text: empty, tone: 'dim' }];
    const levelNote = () => (level.current ? ` at ${level.current} and above` : '');

    return {
      welcome: WELCOME,
      placeholder: 'tail · follow · ref 2276771245 · help',
      async run(typed: string): Promise<Outcome> {
        const command = parseLogsCommand(typed);
        switch (command.name) {
          case 'error':
            return { lines: command.message ? [{ text: command.message, tone: 'danger' }] : [] };
          case 'help':
            return { lines: HELP.map((text) => ({ text, tone: 'dim' as const })) };
          case 'clear':
            return { clear: true };
          case 'stop':
            return { stop: true };
          case 'level':
            level.current = command.level;
            return {
              lines: [
                {
                  text: command.level
                    ? `Showing ${command.level} and above from now on.`
                    : 'Showing every level from now on.',
                  tone: 'ok',
                },
              ],
            };
          case 'tail': {
            const logs = await server({ limit: String(command.lines) });
            return {
              lines: [
                ...print(logs, `Nothing${levelNote()} yet.`),
                {
                  text: `${logs.lines.length} of ${logs.held} lines held${levelNote()}.`,
                  tone: 'dim',
                },
              ],
            };
          }
          case 'follow': {
            let since = (await server({ limit: '1' })).newest;
            return {
              follow: {
                lines: [
                  {
                    text: `Following${levelNote()}. Type stop, or press Escape, to end it.`,
                    tone: 'ok',
                  },
                ],
                poll: async () => {
                  const logs = await server({ since: String(since), limit: '500' });
                  since = Math.max(since, logs.newest);
                  return [
                    ...(logs.dropped
                      ? [{ text: '… some lines went by too fast to show.', tone: 'dim' as const }]
                      : []),
                    ...[...logs.lines].reverse().map((l) => serverLine(l, timezone)),
                  ];
                },
              },
            };
          }
          case 'grep': {
            const logs = await server({ search: command.text, limit: '200' });
            return { lines: print(logs, `No line${levelNote()} mentions "${command.text}".`) };
          }
          case 'req': {
            const logs = await server({ reqId: command.id, limit: '500' });
            return {
              lines: print(
                logs,
                `No lines for ${command.id}: the server no longer holds them, or it is not a request id.`,
              ),
            };
          }
          case 'user': {
            const logs = await server({ user: command.email, limit: '200' });
            return { lines: print(logs, `No lines for ${command.email}${levelNote()}.`) };
          }
          case 'actions': {
            const query = new URLSearchParams({ limit: String(command.limit) });
            if (command.since) query.set('since', command.since);
            if (command.user) query.set('user', command.user);
            if (command.action) query.set('action', command.action);
            const { rows, nextBefore } = await clientApi<{
              rows: ActionRow[];
              nextBefore: string | null;
            }>(`/dev/logs/actions?${query}`);
            return {
              lines: rows.length
                ? [
                    ...[...rows].reverse().map((r) => actionLine(r, timezone)),
                    {
                      text: `${rows.length} action${rows.length === 1 ? '' : 's'}${nextBefore ? ', and more before them: narrow it with --since or --limit' : ''}.`,
                      tone: 'dim',
                    },
                  ]
                : [{ text: 'Nobody did anything, with those filters.', tone: 'dim' }],
            };
          }
          case 'ref':
            return { lines: lookupLines(await lookup(command.reference), timezone) };
        }
      },
    };
  }, [timezone]);

  return <Terminal program={program} label="The server log" />;
}

const lookup = (reference: string) =>
  clientApi<ErrorLookup>(`/dev/errors/lookup?${new URLSearchParams({ q: reference })}`);

/** The same answer Dev → Errors gives, in a few lines, with the address of the whole of it. */
function lookupLines(answer: ErrorLookup, timezone: string): Line[] {
  const link = answer.reference
    ? [
        {
          text: `The whole of it: /dev/errors?ref=${encodeURIComponent(answer.reference)}`,
          tone: 'dim' as const,
        },
      ]
    : [];
  if (!answer.found) return [{ text: answer.message, tone: 'warn' }, ...link];
  const { error, underneath } = answer;
  const who = error.who ? `${error.who.name} <${error.who.email}>` : 'nobody signed in';
  return [
    ...(answer.hint ? [{ text: `Likely cause: ${answer.hint}`, tone: 'warn' as const }] : []),
    {
      text: `${clock(error.at, timezone, true)}  ${error.source}  ${error.method ?? ''} ${error.path ?? ''}  ×${error.count}`,
      tone: 'accent',
    },
    {
      text: `  who: ${who}${error.viewer ? `, viewed as them by ${error.viewer.name}` : ''}`,
    },
    { text: `  ${error.message}`, tone: 'danger' },
    ...(underneath
      ? [
          {
            text: `  underneath: ${underneath.method ?? ''} ${underneath.path ?? ''} ${underneath.status ?? ''}`,
          },
          { text: `  ${underneath.message}`, tone: 'danger' as const },
        ]
      : []),
    ...(answer.request?.lines.length
      ? [
          { text: `  request ${answer.request.id.slice(0, 8)}:`, tone: 'dim' as const },
          ...answer.request.lines.map((l) => ({
            ...serverLine(l, timezone),
            text: `    ${serverLine(l, timezone).text}`,
          })),
        ]
      : []),
    ...link,
  ];
}

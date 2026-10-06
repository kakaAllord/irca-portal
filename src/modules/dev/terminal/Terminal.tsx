'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/lib/api/errors';

/** One line on the screen, and its colour. */
export type Line = { text: string; tone?: 'dim' | 'accent' | 'danger' | 'ok' | 'warn' };

/**
 * What running one typed line does: print lines, clear the screen, start
 * following something (printing lines as they arrive until stopped), or stop.
 */
export type Outcome =
  | { lines: Line[] }
  | { clear: true }
  | { follow: { lines: Line[]; poll: () => Promise<Line[]>; everyMs?: number } }
  | { stop: true };

/** A terminal's own commands: the page that uses it brings them. */
export type Program = {
  /** Shown when the page opens. */
  welcome: Line[];
  placeholder: string;
  run: (typed: string) => Promise<Outcome>;
};

type Block = { id: number; typed: string | null; lines: Line[] };

const TONES: Record<NonNullable<Line['tone']>, string> = {
  dim: 'text-fg3',
  accent: 'text-accent',
  danger: 'text-danger',
  ok: 'text-pos',
  warn: 'text-warn-fg',
};

/**
 * A terminal: type a command, read the answer under it.
 *
 * Nothing it runs may change anything: every command a program offers is a
 * read. Following polls for what has happened since the last thing it showed,
 * so an open screen fills in as people work; typing stop, pressing Escape or
 * leaving the page ends it. The arrow keys bring back what was typed before,
 * as a terminal does.
 */
export function Terminal({ program, label }: { program: Program; label: string }) {
  const [blocks, setBlocks] = useState<Block[]>([{ id: 0, typed: null, lines: program.welcome }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const history = useRef<string[]>([]);
  const historyAt = useRef<number | null>(null);
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const follow = useRef<{ poll: () => Promise<Line[]>; every: number; timer?: number } | null>(
    null,
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [blocks]);

  // Leaving the page must not leave a poll running.
  useEffect(() => () => window.clearTimeout(follow.current?.timer), []);

  function write(lines: Line[], typed: string | null = null) {
    setBlocks((old) => [...old, { id: nextId.current++, typed, lines }]);
  }

  function stopFollowing(say = true) {
    window.clearTimeout(follow.current?.timer);
    follow.current = null;
    setFollowing(false);
    if (say) write([{ text: 'Stopped following.', tone: 'dim' }]);
  }

  async function poll() {
    const current = follow.current;
    if (!current) return;
    try {
      const lines = await current.poll();
      if (follow.current === current && lines.length) write(lines);
    } catch {
      write([{ text: 'Lost the connection. Following again in a moment.', tone: 'danger' }]);
    }
    if (follow.current === current) {
      current.timer = window.setTimeout(poll, current.every);
    }
  }

  async function run(typed: string) {
    setBusy(true);
    let outcome: Outcome;
    try {
      outcome = await program.run(typed);
    } catch (err) {
      outcome = {
        lines: [
          {
            text: err instanceof ApiRequestError ? err.message : 'That did not work. Try again.',
            tone: 'danger',
          },
        ],
      };
    } finally {
      setBusy(false);
    }

    if ('stop' in outcome) {
      write([], typed);
      return following
        ? stopFollowing()
        : write([{ text: 'Not following anything.', tone: 'dim' }]);
    }
    // Anything else typed while following takes over the screen, so end it first.
    if (following) stopFollowing(false);
    if ('clear' in outcome) return setBlocks([]);
    if ('follow' in outcome) {
      write(outcome.follow.lines, typed);
      follow.current = { poll: outcome.follow.poll, every: outcome.follow.everyMs ?? 2_000 };
      setFollowing(true);
      return void poll();
    }
    write(outcome.lines, typed);
  }

  return (
    <div
      className="flex h-[calc(100dvh-190px)] min-h-[420px] flex-col overflow-hidden rounded-[10px] border border-border bg-[#0d1117] font-mono text-[12px] leading-[1.55] text-[#d7dde5]"
      onClick={() => field.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite" aria-label={label}>
        {blocks.map((block) => (
          <div key={block.id} className="mb-1.5">
            {block.typed !== null && (
              <p className="text-[#7fd1b9]">
                <span className="text-[#5a6673]">irca&gt;</span> {block.typed}
              </p>
            )}
            {block.lines.map((line, i) => (
              <p
                key={i}
                className={`break-words whitespace-pre-wrap ${line.tone ? TONES[line.tone] : ''}`}
              >
                {line.text || ' '}
              </p>
            ))}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-[#1d2530] px-4 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const typed = input.trim();
          if (!typed || busy) return;
          history.current = [typed, ...history.current].slice(0, 100);
          historyAt.current = null;
          setInput('');
          void run(typed);
        }}
      >
        <label htmlFor="terminal-command" className="text-[#5a6673]">
          irca&gt;
        </label>
        <input
          id="terminal-command"
          ref={field}
          value={input}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Command"
          placeholder={following ? 'following… type stop to end it' : program.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const at =
                historyAt.current === null
                  ? 0
                  : Math.min(historyAt.current + 1, history.current.length - 1);
              if (history.current[at] !== undefined) {
                historyAt.current = at;
                setInput(history.current[at]!);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const at = historyAt.current === null ? null : historyAt.current - 1;
              historyAt.current = at !== null && at >= 0 ? at : null;
              setInput(
                historyAt.current === null ? '' : (history.current[historyAt.current] ?? ''),
              );
            } else if (e.key === 'Escape' && following) {
              stopFollowing();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[#d7dde5] placeholder:text-[#4a5561] focus:outline-none"
        />
        {busy && <span className="text-[#5a6673]">working…</span>}
        {following && <span className="text-accent">● live</span>}
      </form>
    </div>
  );
}

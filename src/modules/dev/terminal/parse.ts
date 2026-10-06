/**
 * The dev console's terminals read commands by typing, not by clicking.
 *
 * The questions asked of a log are of the shape "everything Paul did in the
 * last hour", which is a filter with three parts. A row of dropdowns for that
 * is slower to use than a line of text, and a line of text can be pasted into
 * a support thread. Each terminal has its own small command language, built
 * from these pieces, parsed away from React where it can be tested by itself.
 */

/** Words, keeping "two words" in quotes together, including after a flag. */
export function tokenize(line: string): string[] {
  return (line.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((part) => part.replace(/"/g, ''));
}

/**
 * `--name=value` flags, and the words that were not flags. A flag that is
 * not one of `allowed`, or has no value, is an error that names it, rather
 * than something quietly ignored.
 */
export function readFlags<const F extends string>(
  parts: string[],
  allowed: readonly F[],
): { flags: Partial<Record<F, string>>; loose: string[]; error?: string } {
  const flags: Partial<Record<F, string>> = {};
  const loose: string[] = [];
  for (const part of parts) {
    if (!part.startsWith('--')) {
      loose.push(part);
      continue;
    }
    const [key, ...value] = part.slice(2).split('=');
    const flag = allowed.find((f) => f === key);
    if (!flag) {
      return { flags, loose, error: `"--${key}" is not one of ${allowed.join(', ')}.` };
    }
    if (!value.length || !value.join('=')) {
      return { flags, loose, error: `--${key} needs a value, like --${key}=something.` };
    }
    flags[flag] = value.join('=');
  }
  return { flags, loose };
}

/** 30m, 24h, 7d or a date such as 2026-09-01: how every terminal says "since". */
export const isMoment = (text: string) =>
  /^\d+[mhd]$/.test(text) || !Number.isNaN(new Date(text).getTime());

/** A whole number within bounds, or null. */
export function wholeNumber(text: string | undefined, min: number, max: number): number | null {
  if (text === undefined) return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

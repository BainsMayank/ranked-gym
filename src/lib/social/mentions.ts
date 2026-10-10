/**
 * @mentions, matched exactly as the server matches them (`social_mentions`): an @ at the start or
 * after a non-word character, then a 3–20 character username.
 */

const MENTION = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})/g;

export type Segment = { kind: 'text'; text: string } | { kind: 'mention'; username: string };

/** Splits text into plain runs and mentions, for rendering @names as links. */
export function mentionSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const at = (m.index ?? 0) + (m[1]?.length ?? 0);
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    out.push({ kind: 'mention', username: (m[2] ?? '').toLowerCase() });
    last = at + 1 + (m[2]?.length ?? 0);
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export interface ActiveMention {
  /** Index of the @. */
  start: number;
  /** What follows it so far (may be empty). */
  query: string;
}

/** The mention being typed at the caret, if any ("hey @aa|" → {start: 4, query: 'aa'}). */
export function activeMention(text: string, caret: number): ActiveMention | null {
  const before = text.slice(0, caret);
  const m = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{0,20})$/.exec(before);
  if (!m) return null;
  return { start: before.length - (m[2]?.length ?? 0) - 1, query: (m[2] ?? '').toLowerCase() };
}

/** Replaces the mention being typed with "@username " and returns the new text and caret. */
export function insertMention(
  text: string,
  mention: ActiveMention,
  username: string,
  caret: number,
): { text: string; caret: number } {
  const inserted = `@${username} `;
  const after = text.slice(caret).replace(/^[a-zA-Z0-9_]*/, '');
  const next = text.slice(0, mention.start) + inserted + after.replace(/^ /, '');
  return { text: next, caret: mention.start + inserted.length };
}

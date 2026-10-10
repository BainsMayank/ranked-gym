import { activeMention, insertMention, mentionSegments } from '../mentions';

describe('mentionSegments', () => {
  it('splits mentions out of text the way the server matches them', () => {
    expect(mentionSegments('Great set @Aarav_R and @dev!')).toEqual([
      { kind: 'text', text: 'Great set ' },
      { kind: 'mention', username: 'aarav_r' },
      { kind: 'text', text: ' and ' },
      { kind: 'mention', username: 'dev' },
      { kind: 'text', text: '!' },
    ]);
  });

  it('ignores emails and names that are too short', () => {
    expect(mentionSegments('mail me@site.com or @ab')).toEqual([
      { kind: 'text', text: 'mail me@site.com or @ab' },
    ]);
  });

  it('handles a mention at the start', () => {
    expect(mentionSegments('@riya nice')[0]).toEqual({ kind: 'mention', username: 'riya' });
  });
});

describe('activeMention', () => {
  it('finds the mention being typed at the caret', () => {
    expect(activeMention('hey @aa', 7)).toEqual({ start: 4, query: 'aa' });
    expect(activeMention('hey @', 5)).toEqual({ start: 4, query: '' });
  });

  it('returns null outside a mention', () => {
    expect(activeMention('hey aa', 6)).toBeNull();
    expect(activeMention('me@site', 7)).toBeNull();
  });
});

describe('insertMention', () => {
  it('replaces the typed fragment with the username and a space', () => {
    const text = 'nice one @aa';
    const m = activeMention(text, text.length);
    expect(m).not.toBeNull();
    expect(insertMention(text, m!, 'aarav', text.length)).toEqual({
      text: 'nice one @aarav ',
      caret: 16,
    });
  });

  it('keeps the text after the caret', () => {
    const text = '@a see you';
    expect(insertMention(text, { start: 0, query: 'a' }, 'aarav', 2)).toEqual({
      text: '@aarav see you',
      caret: 7,
    });
  });
});

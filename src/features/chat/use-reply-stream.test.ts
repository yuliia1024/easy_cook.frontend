import { buildSuggestedMenu } from '../../test/fixtures';
import { toPending } from './use-reply-stream';

describe('toPending', () => {
  it('joins the text parts of a streamed message', () => {
    expect(
      toPending({
        id: 'm',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type: 'text', text: 'Hel' },
          { type: 'text', text: 'lo' },
        ],
      }),
    ).toEqual({ id: 'm', role: 'assistant', content: 'Hello', menuId: null, suggestedMenu: null });
  });

  it('keeps the user role', () => {
    expect(toPending({ id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] })).toEqual({
      id: 'u',
      role: 'user',
      content: 'Hi',
      menuId: null,
      suggestedMenu: null,
    });
  });

  it('leaves data parts out of the text', () => {
    expect(
      toPending({
        id: 'c',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'How many days?' },
          { type: 'data-clarification', data: { missingFields: ['days'] } },
        ],
      }).content,
    ).toBe('How many days?');
  });

  it('takes the suggested menu from the data-menu part', () => {
    const menu = buildSuggestedMenu();

    expect(
      toPending({
        id: 'r',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Here is your day.' },
          { type: 'data-menu', data: menu },
        ],
      }),
    ).toMatchObject({ content: 'Here is your day.', suggestedMenu: menu });
  });
});

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
    ).toEqual({ id: 'm', role: 'assistant', content: 'Hello', menuId: null });
  });

  it('keeps the user role', () => {
    expect(toPending({ id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] })).toEqual({
      id: 'u',
      role: 'user',
      content: 'Hi',
      menuId: null,
    });
  });
});

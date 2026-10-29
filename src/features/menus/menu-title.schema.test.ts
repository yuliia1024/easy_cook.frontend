import { menuTitleSchema } from './menu-title.schema';

describe('menuTitleSchema', () => {
  it('trims the title', () => {
    expect(menuTitleSchema.parse({ title: '  Week 43 ' })).toEqual({ title: 'Week 43' });
  });

  it('rejects an empty or too long title', () => {
    const empty = menuTitleSchema.safeParse({ title: '   ' });
    expect(empty.error?.issues[0]?.message).toBe('Enter a title');
    const long = menuTitleSchema.safeParse({ title: 'x'.repeat(256) });
    expect(long.error?.issues[0]?.message).toBe('At most 255 characters');
  });
});

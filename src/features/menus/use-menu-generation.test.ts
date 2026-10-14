import type { MenuGenerationMessage } from '../../api/types';
import { toProgress } from './use-menu-generation';

const day = (attempt: number, dayIndex: number) => ({
  type: 'data-day' as const,
  id: `day-${dayIndex}`,
  data: { attempt, dayIndex, date: null, meals: [] },
});

const message = (parts: MenuGenerationMessage['parts']): MenuGenerationMessage => ({
  id: 'm',
  role: 'assistant',
  parts,
});

describe('toProgress', () => {
  it('is null before planning starts', () => {
    expect(toProgress(undefined)).toBeNull();
    expect(toProgress(message([]))).toBeNull();
  });

  it('keeps the days of the current attempt in order and the latest rejection', () => {
    const progress = toProgress(
      message([
        { type: 'data-status', id: 'status', data: { attempt: 2, maxAttempts: 3 } },
        { type: 'data-issues', id: 'issues', data: { attempt: 1, messages: ['too much'] } },
        day(2, 1),
        day(1, 2),
        day(2, 0),
      ]),
    );

    expect(progress).toEqual({
      attempt: 2,
      maxAttempts: 3,
      days: [day(2, 0).data, day(2, 1).data],
      rejection: { attempt: 1, messages: ['too much'] },
    });
  });

  it('has no rejection while every attempt passed', () => {
    const progress = toProgress(
      message([{ type: 'data-status', id: 'status', data: { attempt: 1, maxAttempts: 3 } }]),
    );

    expect(progress?.rejection).toBeNull();
  });
});

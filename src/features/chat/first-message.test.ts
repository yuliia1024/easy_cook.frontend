import { queueFirstMessage, takeFirstMessage } from './first-message';

describe('first message', () => {
  it('gives the queued message of a conversation once', () => {
    queueFirstMessage('a', 'Hello');
    queueFirstMessage('b', 'Plan a menu');

    expect(takeFirstMessage('a')).toBe('Hello');
    expect(takeFirstMessage('a')).toBeUndefined();
    expect(takeFirstMessage('b')).toBe('Plan a menu');
  });

  it('has nothing for a conversation that was not started with a message', () => {
    expect(takeFirstMessage('unknown')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { getWelcomeMessage } from '../index.js';

describe('main functions', () => {
  it('should return welcome message', async () => {
    const message = await getWelcomeMessage();
    expect(message).toContain('Welcome');
    expect(message).toContain('TypeScript ESM');
  });
});

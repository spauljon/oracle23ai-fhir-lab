import { describe, expect, it } from 'vitest';
import { toDateZeroTime } from '../date';

describe('date formatting function tests', () => {
  it('test invalid 8601', async () => {
    const actual = toDateZeroTime("xxxx");

    expect(actual).toBeNull();
  });
});

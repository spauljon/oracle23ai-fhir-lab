import { describe, expect, it } from 'vitest';
import dasfixture from './fixtures/daily-activity-summary-observation.json';
import { applyTransforms } from '../../../consumer/handler/transforms';
import { R4_Observation, R4Observation } from '../../../consumer/handler/types';

const das: R4Observation = R4_Observation.parse(dasfixture);

describe('column transform tests', () => {
  it('test daily activity summary', async () => {
    const actual = applyTransforms(das);

    expect(actual.observationId).toBe('test-daily-summary-0001');
  });

});

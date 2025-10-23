import { describe, expect, it } from 'vitest';
import dasfixture from './fixtures/daily-activity-summary-observation.json';
import { applyTransforms } from '@handler/vector/transforms';
import { R4_Observation, R4Observation } from '@handler/vector/types';
import { DateTime } from 'luxon';

const das: R4Observation = R4_Observation.parse(dasfixture);

describe('column transform tests', () => {
  it('test daily activity summary', async () => {
    const actuals = await applyTransforms(das);
    const actual = actuals[0];

    expect(actual.observationId).toBe(das.id);
    expect(actual.patientId).contains('11331');
    expect(actual.effectiveStart).toEqual(
      DateTime.fromISO(das?.effectivePeriod?.start ?? '')
    );
    expect(actual.effectiveEnd).toEqual(
      DateTime.fromISO(das?.effectivePeriod?.end ?? '')
    );
  });
});

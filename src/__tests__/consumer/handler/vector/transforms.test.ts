import { describe, it } from 'vitest';
import dasfixture from './fixtures/daily-activity-summary-observation.json';
import { R4_Observation, R4Observation } from '@/fhir/observation';

// @ts-ignore
const das: R4Observation = R4_Observation.parse(dasfixture);

describe('column transform tests', () => {
  it('test daily activity summary', async () => {});
});

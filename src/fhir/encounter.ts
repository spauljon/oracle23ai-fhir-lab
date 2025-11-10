import { z } from 'zod';
import {
  R4_CodeableConcept,
  R4_Coding,
  R4_Period,
  R4_Reference,
} from './types';

export const R4_Encounter = z.object({
  resourceType: z.literal('Encounter'),
  id: z.string().optional(),
  subject: R4_Reference.optional(),
  period: R4_Period.optional(),
  class: R4_Coding.optional(),
  type: z.array(R4_CodeableConcept).optional(),
  reasonReference: z.array(R4_Reference).optional(),
});

export type R4Encounter = z.infer<typeof R4_Encounter>;

import { z } from 'zod';
import { R4_CodeableConcept, R4_Period, R4_Reference } from 'fhir/types';

export const R4_Condition = z.object({
  resourceType: z.literal('Condition'),
  id: z.string().optional(),
  subject: R4_Reference.optional(), // Patient|Group (required in practice)
  encounter: R4_Reference.optional(),
  code: R4_CodeableConcept.optional(), // the actual condition code (often SNOMED)
  clinicalStatus: R4_CodeableConcept.optional(), // e.g., active | recurrence | relapse | inactive | resolved
  onsetDateTime: z.string().optional(),
  onsetPeriod: R4_Period.optional(),
  abatementDateTime: z.string().optional(),
  abatementPeriod: R4_Period.optional(),
});

export type R4Condition = z.infer<typeof R4_Condition>;

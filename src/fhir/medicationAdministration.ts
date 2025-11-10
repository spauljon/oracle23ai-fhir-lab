import { z } from 'zod';
import { R4_CodeableConcept, R4_Period, R4_Reference } from 'fhir/types.js';

const R4_MedicationAdministrationPerformer = z.object({
  function: R4_CodeableConcept.optional(),
  actor: R4_Reference,
  onBehalfOf: R4_Reference.optional(),
});

export const R4_MedicationAdministration = z.object({
  resourceType: z.literal('MedicationAdministration'),
  id: z.string().optional(),
  subject: R4_Reference.optional(),
  performer: z.array(R4_MedicationAdministrationPerformer).optional(),
  medicationCodeableConcept: R4_CodeableConcept.optional(),
  effectiveDateTime: z.string().optional(),
  effectivePeriod: R4_Period.optional(),
});

export type R4MedicationAdministration = z.infer<typeof R4_MedicationAdministration>;

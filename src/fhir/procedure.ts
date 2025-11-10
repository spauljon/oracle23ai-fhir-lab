import { z } from 'zod';
import { R4_CodeableConcept, R4_Period, R4_Reference } from 'fhir/types';

const ProcedurePerformer = z.object({
  function: R4_CodeableConcept.optional(),
  actor: R4_Reference.optional(), // Practitioner | PractitionerRole | Organization | Patient |
  onBehalfOf: R4_Reference.optional(), // Organization
});

export const R4_Procedure = z.object({
  resourceType: z.literal('Procedure'),
  id: z.string().optional(),
  subject: R4_Reference.optional(),
  encounter: R4_Reference.optional(),
  code: R4_CodeableConcept.optional(),
  performedDateTime: z.string().optional(),
  performedPeriod: R4_Period.optional(),
  performer: z.array(ProcedurePerformer).optional(),
});

export type R4Procedure = z.infer<typeof R4_Procedure>;
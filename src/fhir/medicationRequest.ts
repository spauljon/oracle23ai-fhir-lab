import { z } from 'zod';
import { R4_CodeableConcept, R4_Reference } from 'fhir/types';

export const R4_MedicationRequest = z.object({
  resourceType: z.literal('MedicationRequest'),
  id: z.string().optional(),
  subject: R4_Reference.optional(),
  requester: R4_Reference.optional(),
  medicationCodeableConcept: R4_CodeableConcept.optional(),
  status: z.enum([
    "active",
    "on-hold",
    "cancelled",
    "completed",
    "entered-in-error",
    "stopped",
    "draft",
    "unknown",
  ]).optional(),
  authoredOn: z.string().optional(),
});

export type R4MedicationRequest = z.infer<typeof R4_MedicationRequest>;

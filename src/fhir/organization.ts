import { z } from 'zod';
import { R4_CodeableConcept } from 'fhir/types';

export const R4_Organization = z.object({
  resourceType: z.literal("Organization"),
  id: z.string().optional(),
  type: z.array(R4_CodeableConcept).optional(),
  name: z.string().optional(),
});

export type R4Organization = z.infer<typeof R4_Organization>;

import { z } from 'zod';
import { R4_CodeableConcept } from 'fhir/types';

export const R4_Location = z.object({
  resourceType: z.literal("Location"),
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.array(R4_CodeableConcept).optional(),
});

export type R4Location = z.infer<typeof R4_Location>;

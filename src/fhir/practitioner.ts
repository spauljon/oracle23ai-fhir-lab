import { z } from 'zod';
import { R4_HumanName } from 'fhir/patient';

export const R4_Practitioner = z.object({
  resourceType: z.literal('Practitioner'),
  id: z.string().optional(),
  name: z.array(R4_HumanName).optional(),
});

export type R4Practitioner = z.infer<typeof R4_Practitioner>;

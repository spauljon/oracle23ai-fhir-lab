import { z } from 'zod';
import { R4_dateTime } from 'fhir/types';

export const R4_HumanName = z.object({
  use: z.enum(['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden']).optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
});

export type R4HumanName = z.infer<typeof R4_HumanName>;


export const R4_Patient = z.object({
  resourceType: z.literal('Patient'),
  id: z.string(),
  name: z.array(R4_HumanName).optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  birthDate: R4_dateTime.optional()
});

export type R4Patient = z.infer<typeof R4_Patient>;

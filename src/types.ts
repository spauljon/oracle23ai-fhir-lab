import { z } from 'zod';

export interface MessageHandler {
  onMessage(
    data: Uint8Array,
    meta: { seq: number; subject: string }
  ): Promise<void>;
}

export const ResourceTypeSchema = z.enum([
  'Patient',
  'Observation',
  'Encounter',
  'Condition',
  'Procedure',
  'MedicationRequest',
  'MedicationAdministration',
  'Practitioner',
  'Location',
  'Organization',
]);

export type ResourceType = z.infer<typeof ResourceTypeSchema>;

/**
 * Base FHIR message envelope for NATS.
 */
export const FhirMessageSchema = z
  .object({
    op: z.enum(['create', 'update', 'delete']),
    resourceType: ResourceTypeSchema,
    resource: z.string().transform((str) => JSON.parse(str)),
    parsed: z.any().optional(), // typed resource payload (e.g. R4_Observation)
  }).strict();

export type FhirMessage = z.infer<typeof FhirMessageSchema>;

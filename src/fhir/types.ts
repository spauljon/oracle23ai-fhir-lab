import { z } from 'zod';

/** ---------- Common R4 primitives (modeled simply as strings/numbers) ---------- */
export const R4_id = z.string();
export const R4_uri = z.string();
export const R4_code = z.string();
export const R4_dateTime = z.string(); // ISO-8601; keep as string for now
export const R4_time = z.string(); // "HH:MM[:SS]" per FHIR; keep as string
/** ---------- Meta ---------- */

export const R4_Meta = z
  .object({
    versionId: z.string().optional(),
    lastUpdated: R4_dateTime.optional(),
    profile: z.array(R4_uri).optional(),
    security: z.array(z.any()).optional(), // Coding
    tag: z.array(z.any()).optional(), // Coding
  })
  .strict();

/** ---------- Identifier ---------- */
export const R4_Identifier = z
  .object({
    use: z.enum(['usual', 'official', 'temp', 'secondary', 'old']).optional(),
    type: z.any().optional(), // CodeableConcept
    system: z.string().optional(),
    value: z.string().optional(),
    period: z.any().optional(), // Period
    assigner: z.any().optional(), // Reference
  })
  .strict();

/** ---------- Coding / CodeableConcept ---------- */
export const R4_Coding = z
  .object({
    system: z.string().optional(),
    version: z.string().optional(),
    code: R4_code.optional(),
    display: z.string().optional(),
    userSelected: z.boolean().optional(),
  })
  .strict();

export type R4Coding = z.infer<typeof R4_Coding>;

export const R4_CodeableConcept = z
  .object({
    coding: z.array(R4_Coding).optional(),
    text: z.string().optional(),
  })
  .strict();

export type R4CodeableConcept = z.infer<typeof R4_CodeableConcept>;

/** ---------- Reference & Period ---------- */
export const R4_Reference = z
  .object({
    reference: z.string().optional(), // e.g., "Patient/123"
    type: z.string().optional(), // e.g., "Patient"
    identifier: R4_Identifier.optional(),
    display: z.string().optional(),
  })
  .strict();

export type R4Reference = z.infer<typeof R4_Reference>;

export const R4_Period = z
  .object({
    start: R4_dateTime.optional(),
    end: R4_dateTime.optional(),
  })
  .strict();

export type R4Period = z.infer<typeof R4_Period>;

/** ---------- Quantity / Range / Ratio ---------- */
export const R4_Quantity = z
  .object({
    value: z.number().optional(),
    comparator: z.enum(['<', '<=', '>=', '>']).optional(),
    unit: z.string().optional(),
    system: z.string().optional(),
    code: R4_code.optional(),
  })
  .strict();

export type R4Quantity = z.infer<typeof R4_Quantity>;

export const R4_Range = z
  .object({
    low: R4_Quantity.optional(),
    high: R4_Quantity.optional(),
  })
  .strict();

export type R4Range = z.infer<typeof R4_Range>;

export const R4_Ratio = z
  .object({
    numerator: R4_Quantity.optional(),
    denominator: R4_Quantity.optional(),
  })
  .strict();

export type R4Ratio = z.infer<typeof R4_Ratio>;


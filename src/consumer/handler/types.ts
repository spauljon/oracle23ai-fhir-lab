import { z } from "zod";

/** ---------- Common R4 primitives (modeled simply as strings/numbers) ---------- */
export const R4_id = z.string();
export const R4_uri = z.string();
export const R4_code = z.string();
export const R4_dateTime = z.string(); // ISO-8601; keep as string for now
export const R4_time = z.string();     // "HH:MM[:SS]" per FHIR; keep as string

/** ---------- Meta ---------- */
export const R4_Meta = z.object({
  versionId: z.string().optional(),
  lastUpdated: R4_dateTime.optional(),
  profile: z.array(R4_uri).optional(),
  security: z.array(z.any()).optional(), // Coding
  tag: z.array(z.any()).optional(),      // Coding
}).strict();

/** ---------- Identifier ---------- */
export const R4_Identifier = z.object({
  use: z.enum(["usual", "official", "temp", "secondary", "old"]).optional(),
  type: z.any().optional(), // CodeableConcept
  system: z.string().optional(),
  value: z.string().optional(),
  period: z.any().optional(), // Period
  assigner: z.any().optional(), // Reference
}).strict();

/** ---------- Coding / CodeableConcept ---------- */
export const R4_Coding = z.object({
  system: z.string().optional(),
  version: z.string().optional(),
  code: R4_code.optional(),
  display: z.string().optional(),
  userSelected: z.boolean().optional(),
}).strict();

export const R4_CodeableConcept = z.object({
  coding: z.array(R4_Coding).optional(),
  text: z.string().optional(),
}).strict();

/** ---------- Reference & Period ---------- */
export const R4_Reference = z.object({
  reference: z.string().optional(), // e.g., "Patient/123"
  type: z.string().optional(),      // e.g., "Patient"
  identifier: R4_Identifier.optional(),
  display: z.string().optional(),
}).strict();

export const R4_Period = z.object({
  start: R4_dateTime.optional(),
  end: R4_dateTime.optional(),
}).strict();

/** ---------- Quantity / Range / Ratio ---------- */
export const R4_Quantity = z.object({
  value: z.number().optional(),
  comparator: z.enum(["<", "<=", ">=", ">"]).optional(),
  unit: z.string().optional(),
  system: z.string().optional(),
  code: R4_code.optional(),
}).strict();

export const R4_Range = z.object({
  low: R4_Quantity.optional(),
  high: R4_Quantity.optional(),
}).strict();

export const R4_Ratio = z.object({
  numerator: R4_Quantity.optional(),
  denominator: R4_Quantity.optional(),
}).strict();

/** ---------- Observation.value[x] union ---------- */
export const R4_ObsValue = z.union([
  R4_Quantity,              // valueQuantity
  R4_CodeableConcept,       // valueCodeableConcept
  z.string(),               // valueString
  z.boolean(),              // valueBoolean
  z.number().int(),         // valueInteger
  R4_dateTime,              // valueDateTime
  R4_time,                  // valueTime
  R4_Period,                // valuePeriod
  R4_Range,                 // valueRange
  R4_Ratio,                 // valueRatio
]);

/** ---------- Observation.component ---------- */
export const R4_ObservationComponent = z.object({
  code: R4_CodeableConcept,         // required in FHIR
  valueQuantity: R4_ObsValue.optional(),    // value[x]
  dataAbsentReason: R4_CodeableConcept.optional(),
  interpretation: z.array(R4_CodeableConcept).optional(),
}).strict();

/** ---------- Observation.referenceRange ---------- */
export const R4_ObservationReferenceRange = z.object({
  low: R4_Quantity.optional(),
  high: R4_Quantity.optional(),
  type: R4_CodeableConcept.optional(),
  appliesTo: z.array(R4_CodeableConcept).optional(),
  age: R4_Range.optional(),
  text: z.string().optional(),
}).strict();

/** ---------- Observation root ---------- */
export const R4_Observation = z.object({
  resourceType: z.literal("Observation"),
  id: R4_id.optional(),
  meta: R4_Meta.optional(),
  identifier: z.array(R4_Identifier).optional(),
  basedOn: z.array(R4_Reference).optional(),
  partOf: z.array(R4_Reference).optional(),

  status: z.enum([
    "registered",
    "preliminary",
    "final",
    "amended",
    "corrected",
    "cancelled",
    "entered-in-error",
    "unknown",
  ]),

  category: z.array(R4_CodeableConcept).optional(),
  code: R4_CodeableConcept, // required

  subject: R4_Reference.optional(),
  focus: z.array(R4_Reference).optional(),
  encounter: R4_Reference.optional(),

  // effective[x]
  effectiveDateTime: R4_dateTime.optional(),
  effectivePeriod: R4_Period.optional(),
  effectiveTiming: z.any().optional(), // add schema if you need it
  effectiveInstant: R4_dateTime.optional(), // instant is also a string

  issued: R4_dateTime.optional(),

  performer: z.array(R4_Reference).optional(),

  // value[x]
  valueQuantity: R4_Quantity.optional(),
  valueCodeableConcept: R4_CodeableConcept.optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
  valueInteger: z.number().int().optional(),
  valueRange: R4_Range.optional(),
  valueRatio: R4_Ratio.optional(),
  valueSampledData: z.any().optional(), // add schema if you need it
  valueTime: R4_time.optional(),
  valueDateTime: R4_dateTime.optional(),
  valuePeriod: R4_Period.optional(),

  dataAbsentReason: R4_CodeableConcept.optional(),
  interpretation: z.array(R4_CodeableConcept).optional(),
  note: z.array(z.any()).optional(), // Annotation

  bodySite: R4_CodeableConcept.optional(),
  method: R4_CodeableConcept.optional(),
  specimen: R4_Reference.optional(),
  device: R4_Reference.optional(),

  referenceRange: z.array(R4_ObservationReferenceRange).optional(),
  hasMember: z.array(R4_Reference).optional(),
  derivedFrom: z.array(R4_Reference).optional(),

  component: z.array(R4_ObservationComponent).optional(),
}).strict();

export type R4Observation = z.infer<typeof R4_Observation>;
export type R4DateTime = z.infer<typeof R4_dateTime>
export type VectorColumnType = string | number | R4DateTime | undefined;

export interface ColumnTransform {
  apply(observation: R4Observation): VectorColumnType;
}

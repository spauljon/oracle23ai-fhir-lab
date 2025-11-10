import { z } from 'zod';
import {
  R4_CodeableConcept,
  R4_dateTime,
  R4_id,
  R4_Identifier,
  R4_Meta,
  R4_Period,
  R4_Quantity,
  R4_Range,
  R4_Ratio,
  R4_Reference,
  R4_time,
} from 'fhir/types';

/** ---------- Observation.value[x] union ---------- */
export const R4_ObsValueX = z.object({
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
});

export type R4ObsValueX = z.infer<typeof R4_ObsValueX>;

/** ---------- Observation.component ---------- */
export const R4_ObservationComponent = R4_ObsValueX.extend({
  code: R4_CodeableConcept, // required in FHIR
  dataAbsentReason: R4_CodeableConcept.optional(),
  interpretation: z.array(R4_CodeableConcept).optional(),
}).strict();

/** ---------- Observation.referenceRange ---------- */
export const R4_ObservationReferenceRange = z
  .object({
    low: R4_Quantity.optional(),
    high: R4_Quantity.optional(),
    type: R4_CodeableConcept.optional(),
    appliesTo: z.array(R4_CodeableConcept).optional(),
    age: R4_Range.optional(),
    text: z.string().optional(),
  })
  .strict();

/** ---------- Observation root ---------- */
export const R4_Observation = R4_ObsValueX.extend({
  resourceType: z.literal('Observation'),
  id: R4_id.optional(),
  meta: R4_Meta.optional(),
  identifier: z.array(R4_Identifier).optional(),
  basedOn: z.array(R4_Reference).optional(),
  partOf: z.array(R4_Reference).optional(),

  status: z.enum([
    'registered',
    'preliminary',
    'final',
    'amended',
    'corrected',
    'cancelled',
    'entered-in-error',
    'unknown',
  ]).optional(),

  category: z.array(R4_CodeableConcept).optional(),
  code: R4_CodeableConcept.optional(),

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

import {
  R4CodeableConcept,
  R4ObsValueX,
  R4Period,
  R4Quantity,
  R4Range,
  R4Ratio,
  VectorColumnType,
} from '@consumer/types';
import { DateTime } from 'luxon';

const encodeQuantity = (q: R4Quantity): string => {
  return [q.value, q.comparator, q.unit, q.system, q.code]
    .filter((x) => x != null)
    .map((x) => x?.toString())
    .join('|');
};

const encodeRange = (r: R4Range): string => {
  const low = r.low ? encodeQuantity(r.low) : '';
  const high = r.high ? encodeQuantity(r.high) : '';
  return `${low}~~${high}`;
};

const encodeRatio = (r: R4Ratio): string => {
  const num = r.numerator ? encodeQuantity(r.numerator) : '';
  const den = r.denominator ? encodeQuantity(r.denominator) : '';
  return `${num}~~${den}`;
};

const encodePeriod = (p: R4Period): string => {
  return [p.start, p.end].filter(Boolean).join('~~');
};

export const encodeObsValue = (value: R4ObsValueX): string | null => {
  const tryEncode = <T>(
    value: T | undefined,
    prefix: string,
    fn: (v: T) => string
  ): string | null => {
    return value == undefined ? null : `${prefix}:${fn(value)}`;
  };

  return (
    tryEncode(value.valueQuantity, 'QTY', encodeQuantity) ??
    tryEncode(value.valueCodeableConcept, 'CC', encodeCodeableConcept) ??
    tryEncode(value.valueString, 'STR', (v) => v) ??
    tryEncode(value.valueBoolean, 'BOOL', (v) => v.toString()) ??
    tryEncode(value.valueInteger, 'INT', (v) => v.toString()) ??
    tryEncode(value.valueRange, 'RNG', encodeRange) ??
    tryEncode(value.valueRatio, 'RATIO', encodeRatio) ??
    tryEncode(value.valueTime, 'TIME', (v) => v) ??
    tryEncode(value.valueDateTime, 'DT', (v) => v) ??
    tryEncode(value.valuePeriod, 'PERIOD', encodePeriod) ??
    null
  );
};
export const encodeCodeableConcept = (concept: R4CodeableConcept): string => {
  const codings =
    concept.coding
      ?.map((coding) =>
        [
          coding.system,
          coding.version,
          coding.code,
          coding.display,
          coding.userSelected?.toString(), // Convert boolean to string
        ]
          .filter(Boolean)
          .join('|')
      )
      .filter(Boolean) // Remove empty coding strings
      .join('||') ?? '';

  return codings && concept?.text
    ? `${codings}::${concept.text}`
    : codings || concept?.text || '';
};

export const coerceDateTimeTz = (datetime: string) => {
  return DateTime.fromISO(datetime);
};
const encodeFulltextValue = (v: VectorColumnType) => {
  return v instanceof DateTime
    ? [
        v.toLocaleString(DateTime.DATETIME_MED),
        v.toISO(),
        v.toFormat('yyyy-MM-dd HH:mm'),
      ].join(' ')
    : v!.toString();
};

export const coalesceValues = (result: Record<string, VectorColumnType>) => {
  return Object.entries(result)
    .filter(([, v]) => v != null)
    .map(([, v]) => encodeFulltextValue(v))
    .join(' ');
};
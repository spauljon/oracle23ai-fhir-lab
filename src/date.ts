import { LoggerFactory } from 'log';
import { R4Observation } from 'fhir/observation';

const log = LoggerFactory.create();

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function validDate(iso8601Date?: string): Date | null {
  if (iso8601Date) {
    const date = new Date(iso8601Date);

    if (isValidDate(date)) {
      return date;
    } else {
      log.error(
        { iso8601Date },
        'date string is not valid iso8601; discarding'
      );
    }
  }
  return null;
}

export function toDateZeroTime(iso8601Date?: string): Date | null {
  if (iso8601Date) {
    const date = new Date(iso8601Date);

    if (isValidDate(date)) {
      date.setUTCHours(0, 0, 0, 0);

      return date;
    } else {
      log.error(
        { iso8601Date },
        'date string is not valid iso8601; discarding'
      );
    }
  }

  return null;
}

export function effectiveDate(observation: R4Observation) : Date | null {
  const ts =
    observation.effectivePeriod?.start ??
    observation.effectiveDateTime ??
    observation.effectiveInstant;

  return validDate(ts);
}
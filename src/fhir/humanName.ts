import { R4HumanName } from 'fhir/patient';
import { isDefined } from 'system';

export const firstHumanName = (names?: R4HumanName[]): R4HumanName | null => {
  return names?.[0] ?? null;
};

export const firstGivenName = (names?: R4HumanName[]): string | null => {
  return firstHumanName(names)?.given?.[0] ?? null;
};

export const familyName = (names?: R4HumanName[]): string | null => {
  return firstHumanName(names)?.family ?? null;
};

export const firstFullName = (names?: R4HumanName[]): string | null => {
  const firstName = firstHumanName(names);
  const full = [firstName?.given?.[0], firstName?.family]
    .filter(isDefined)
    .join(' ');

  return full.length ? full : null;
};

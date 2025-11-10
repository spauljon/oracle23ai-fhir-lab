import { R4Reference } from 'fhir/types';

export const extractType = (reference?: R4Reference): string | null => {
  return reference?.reference?.split('/')[0] ?? null;
};

export const extractId = (reference?: R4Reference): string | null => {
  return reference?.reference?.split('/')[1] ?? null;
};


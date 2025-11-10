import { R4Observation } from 'fhir/observation';

export type VectorColumnType = string | number | number[] | null | undefined;

export type ColumnTransform = (observation: R4Observation) => VectorColumnType;

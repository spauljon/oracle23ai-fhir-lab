import { ColumnTransform, R4Observation, VectorColumnType } from './types';

class IdColumnTransform implements ColumnTransform {
  apply(observation: R4Observation): VectorColumnType {
    return observation.id;
  }
}

class PatientIdColumnTransform implements ColumnTransform {
  apply(observation: R4Observation): VectorColumnType {
    const str = observation?.subject?.reference;
    const result = (str && new RegExp(/\/([^/]*)$/).exec(str)?.[1]) ?? str;

    return result ?? '<unknown>';
  }
}

const columnTransforms: Record<string, ColumnTransform> = {
  observationId: new IdColumnTransform(),
  patientId: new PatientIdColumnTransform(),
};

export const applyTransforms = (
  observation: R4Observation
): Record<string, VectorColumnType> => {
  const result: Record<string, VectorColumnType> = {};

  for (const columnName of Object.keys(columnTransforms)) {
    const transform = columnTransforms[columnName];

    result[columnName] = transform.apply(observation);
  }

  return result;
};
import {
  ColumnTransform,
  R4CodeableConcept,
  R4Observation,
  R4ObsValueX,
  VectorColumnType,
} from '@consumer/types';
import { coalesceValues, encodeCodeableConcept, encodeObsValue, } from './encode';
import { createHash } from 'node:crypto';
import { createEmbedding } from './embed';

abstract class Transforms {
  protected abstract readonly transforms: Record<string, ColumnTransform>;

  result: Record<string, VectorColumnType>[] = [];
  embedInput: string[][] = [];

  protected _apply(observation: R4Observation): this {
    const _result: Record<string, VectorColumnType> = {};
    const _embedInput = [];
    for (const [field, transform] of Object.entries(this.transforms)) {
      const value = transform(observation);

      _result[field] = value;
      _embedInput.push(`${field}: ${value}`);
    }

    this.result.push(_result);
    this.embedInput.push(_embedInput);

    return this;
  }

  abstract apply(observation: R4Observation): Promise<this>;
}

export class CoreTransforms extends Transforms {
  protected readonly idTransform: ColumnTransform = (
    observation: R4Observation
  ) => {
    return observation.id;
  };

  protected readonly patientIdTransform: ColumnTransform = (
    observation: R4Observation
  ) => {
    const str = observation?.subject?.reference;
    const result = (str && new RegExp(/\/([^/]*)$/).exec(str)?.[1]) ?? str;

    return result ?? '<unknown>';
  };

  protected readonly effStartTransform: ColumnTransform = (
    observation: R4Observation
  ) => {
    return (
      observation?.effectivePeriod?.start ??
      observation.effectiveDateTime ??
      observation.effectiveInstant ??
      null
    );
  };

  protected readonly effEndTransform: ColumnTransform = (
    observation: R4Observation
  ) => {
    return (
      observation?.effectivePeriod?.end ??
      observation.effectiveDateTime ??
      observation.effectiveInstant ??
      null
    );
  };

  protected readonly transforms: Record<string, ColumnTransform> = {
    observationId: this.idTransform,
    patientId: this.patientIdTransform,
    effectiveStart: this.effStartTransform,
    effectiveEnd: this.effEndTransform,
  };

  apply(observation: R4Observation): Promise<this> {
    return Promise.resolve(this._apply(observation));
  }
}

export class MetricTransforms extends Transforms {
  protected readonly transforms: Record<string, ColumnTransform> = {};

  private readonly coreTransforms: Record<string, VectorColumnType>;
  private readonly coreEmbedInput: string[];

  constructor(coreTransforms: CoreTransforms) {
    super();

    this.coreTransforms = { ...coreTransforms.result[0] };
    this.coreEmbedInput = [...coreTransforms.embedInput[0]];
    this.result = [];
    this.embedInput = [];
  }

  private setProperty(
    result: Record<string, VectorColumnType>,
    embedInput: string[],
    name: string,
    value: VectorColumnType
  ) {
    result[name] = value;
    embedInput.push(`${name}: ${value}`);
  }

  private async _applyMetric(
    code?: R4CodeableConcept,
    value?: R4ObsValueX
  ): Promise<this> {
    const transformedValue = value ? encodeObsValue(value) : undefined;

    if (transformedValue && code) {
      const _result: Record<string, VectorColumnType> = {
        ...this.coreTransforms,
      };
      const _embedInput = [...this.coreEmbedInput];

      this.setProperty(
        _result,
        _embedInput,
        'codeText',
        encodeCodeableConcept(code)
      );

      this.setProperty(_result, _embedInput, 'valueText', transformedValue);

      _result.displayText = coalesceValues(_result);

      const embedInputStr = _embedInput.join('\n');
      _result.textSha256 = createHash('sha256')
        .update(embedInputStr, 'utf8')
        .digest('hex');

      _result.embedding = await createEmbedding(embedInputStr);

      this.result.push(_result);
      this.embedInput.push(_embedInput);
    }

    return this;
  }

  async apply(observation: R4Observation): Promise<this> {
    // apply top level metrics
    await this._applyMetric(observation.code, observation);

    for (const comp of observation.component ?? []) {
      await this._applyMetric(comp.code, comp);
    }

    return this;
  }
}

export const applyTransforms = async (
  observation: R4Observation
): Promise<Record<string, VectorColumnType>[]> => {
  return new MetricTransforms(await new CoreTransforms().apply(observation))
    .apply(observation)
    .then((transform) => transform.result);
};

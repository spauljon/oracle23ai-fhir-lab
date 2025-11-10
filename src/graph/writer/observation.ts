import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { R4_Observation, R4Observation } from 'fhir/observation';
import { extractId, extractType } from 'fhir/reference';
import { effectiveDate } from 'date';
import { isDefined } from 'system';

type ObservationRow = {
  obs_id: string;
  patient_id: string | null;
  encounter_id: string | null;
  effective_start: Date | null;
  code?: string | null | undefined;
  value_num?: number | null | undefined;
  unit?: string | null;
};
export class ObservationWriter extends BaseWriter<R4Observation> {
  constructor(pool: OraclePool) {
    super(pool, 'Observation', 'kg_observation', R4_Observation);
  }

  async delete(
    observation: R4Observation,
    ctx: HandlerContext
  ): Promise<number> {
    await this.deleteEdgeRows(observation, ctx);

    return await this.deleteVertexRows(
      'obs_id = :id',
      { id: observation.id },
      ctx
    );
  }

  async merge(observation: R4Observation, ctx: HandlerContext): Promise<void> {
    for (const row of this.generateRow(observation)) {
      await this.mergeVertexRow(['obs_id', 'code'], row, ctx);
    }

    await this.mergeEdgeRows(observation, ctx);
  }

  private async mergeEdgeRows(observation: R4Observation, ctx: HandlerContext) {
    const coreData = {
      patient_id: extractId(observation.subject),
      obs_id: observation.id,
    };

    await this.deleteEdgeRows(observation, ctx);

    await this.mergeRow(
      'e_has_observation',
      ['patient_id', 'obs_id'],
      coreData,
      ctx
    );

    if (isDefined(observation.encounter)) {
      const data = {
        ...coreData,
        encounter_id: extractId(observation.encounter),
      };
      await this.mergeRow(
        'e_recorded_during',
        ['encounter_id', 'obs_id'],
        data,
        ctx
      );
    }

    const performer = observation.performer?.[0];
    if (extractType(performer) === 'Practitioner') {
      const data = {
        ...coreData,
        practitioner_id: extractId(performer),
      };
      await this.mergeRow(
        'e_authored_by',
        ['obs_id', 'practitioner_id'],
        data,
        ctx
      );
    }
  }

  private *generateRow(
    observation: R4Observation
  ): Generator<ObservationRow, void, unknown> {
    const row: ObservationRow = {
      obs_id: observation.id!,
      patient_id: extractId(observation.subject),
      encounter_id: extractId(observation.encounter),
      effective_start: effectiveDate(observation),
    };

    if (isDefined(observation.valueQuantity)) {
      const quant = observation.valueQuantity;
      row.code = quant.code ?? null;
      row.value_num = quant.value ?? null;
      row.unit = quant.unit ?? null;

      yield row;
    }
    for (const comp of observation.component ?? []) {
      const quant = comp.valueQuantity;

      if (quant) {
        row.code = comp.code?.coding?.[0]?.code ?? null;
        row.value_num = quant?.value ?? null;
        row.unit = quant?.unit ?? null;

        yield row;
      }
    }
  }

  private async deleteEdgeRows(
    observation: R4Observation,
    ctx: HandlerContext
  ): Promise<void> {
    const qual = 'obs_id = :id';
    const params = { id: observation.id };

    await this.dao.delete(
      this.oracleSchema,
      'e_has_observation',
      qual,
      params,
      ctx
    );

    await this.dao.delete(
      this.oracleSchema,
      'e_recorded_during',
      qual,
      params,
      ctx
    );

    await this.dao.delete(
      this.oracleSchema,
      'e_authored_by',
      qual,
      params,
      ctx
    );
  }
}

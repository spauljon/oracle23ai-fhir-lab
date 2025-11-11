import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { R4_Condition, R4Condition } from 'fhir/condition';
import { extractId } from 'fhir/reference';
import { validDate } from 'date';

type ConditionRow = {
  cond_id: string;
  patient_id: string | null;
  code?: string | null | undefined;
  display?: string | null | undefined;
  clinical_status?: string | null | undefined;
  onset?: Date | null;
  abatement?: Date | null;
};

export class ConditionWriter extends BaseWriter<R4Condition> {
  constructor(pool: OraclePool) {
    super(pool, 'Condition', 'kg_condition', R4_Condition);
  }

  async delete(condition: R4Condition, ctx: HandlerContext): Promise<number> {
    await this.deleteEdgeRows(condition, ctx);

    return await this.deleteVertexRows(
      'cond_id = :id',
      { id: condition.id },
      ctx
    );
  }

  async merge(condition: R4Condition, ctx: HandlerContext): Promise<void> {
    const coding = condition.code?.coding?.[0];
    const row: ConditionRow = {
      cond_id: condition.id!,
      patient_id: extractId(condition.subject),
      code: coding?.code ?? null,
      display: coding?.display ?? null,
      clinical_status: condition.clinicalStatus?.coding?.[0].code ?? null,
      onset: validDate(condition.onsetDateTime ?? condition.onsetPeriod?.start),
      abatement: validDate(
        condition.abatementDateTime ?? condition.abatementPeriod?.start
      ),
    };

    await this.mergeVertexRow(['cond_id'], row, ctx);

    await this.mergeEdgeRows(condition, ctx);
  }

  private async deleteEdgeRows(
    condition: R4Condition,
    ctx: HandlerContext
  ): Promise<void> {
    const qual = 'cond_id = :id';
    const params = { id: condition.id };

    await this.dao.delete(
      this.oracleSchema,
      'e_has_condition',
      qual,
      params,
      ctx
    );
  }

  private async mergeEdgeRows(
    condition: R4Condition,
    ctx: HandlerContext
  ): Promise<void> {
    await this.deleteEdgeRows(condition, ctx);

    const coreData = {
      patient_id: extractId(condition.subject),
      cond_id: condition.id,
    };

    await this.mergeRow(
      'e_has_condition',
      ['patient_id', 'cond_id'],
      coreData,
      ctx
    );
  }
}

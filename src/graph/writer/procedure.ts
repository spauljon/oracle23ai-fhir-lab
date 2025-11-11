import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { extractId } from 'fhir/reference';
import { validDate } from 'date';
import { R4_Procedure, R4Procedure } from 'fhir/procedure';

type ProcedureRow = {
  proc_id: string;
  patient_id: string | null;
  encounter_id: string | null;
  code?: string | null | undefined;
  display?: string | null | undefined;
  performed_start?: Date | null;
  performer_id: string | null;
};

export class ProcedureWriter extends BaseWriter<R4Procedure> {
  constructor(pool: OraclePool) {
    super(pool, 'Procedure', 'kg_procedure', R4_Procedure);
  }

  async delete(procedure: R4Procedure, ctx: HandlerContext): Promise<number> {
    await this.deleteEdgeRows(procedure, ctx);

    return await this.deleteVertexRows(
      'proc_id = :id',
      { id: procedure.id },
      ctx
    );
  }

  async merge(procedure: R4Procedure, ctx: HandlerContext): Promise<void> {
    const coding = procedure.code?.coding?.[0];
    const row: ProcedureRow = {
      proc_id: procedure.id!,
      patient_id: extractId(procedure.subject),
      encounter_id: extractId(procedure.encounter),
      code: coding?.code ?? null,
      display: coding?.display ?? null,
      performed_start: validDate(
        procedure.performedDateTime ?? procedure.performedPeriod?.start
      ),
      performer_id: extractId(procedure.performer?.[0]?.actor),
    };

    await this.mergeVertexRow(['proc_id'], row, ctx);

    await this.mergeEdgeRows(procedure, ctx);
  }

  private async deleteEdgeRows(
    procedure: R4Procedure,
    ctx: HandlerContext
  ): Promise<void> {
    const qual = 'proc_id = :id';
    const params = { id: procedure.id };

    await this.dao.delete(
      this.oracleSchema,
      'e_had_procedure',
      qual,
      params,
      ctx
    );
  }

  private async mergeEdgeRows(
    procedure: R4Procedure,
    ctx: HandlerContext
  ): Promise<void> {
    await this.deleteEdgeRows(procedure, ctx);

    const coreData = {
      patient_id: extractId(procedure.subject),
      proc_id: procedure.id,
    };

    await this.mergeRow(
      'e_had_procedure',
      ['patient_id', 'proc_id'],
      coreData,
      ctx
    );
  }
}

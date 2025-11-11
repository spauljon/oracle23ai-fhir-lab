import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { R4_Encounter, R4Encounter } from 'fhir/encounter';
import { validDate } from 'date';
import { extractId } from 'fhir/reference';

export class EncounterWriter extends BaseWriter<R4Encounter> {
  constructor(pool: OraclePool) {
    super(pool, 'Encounter', 'kg_encounter', R4_Encounter);
  }

  async delete(encounter: R4Encounter, ctx: HandlerContext): Promise<number> {
    return await this.deleteVertexRows(
      'encounter_id = :id',
      { id: encounter.id },
      ctx
    );
  }

  async merge(encounter: R4Encounter, ctx: HandlerContext): Promise<void> {
    const period = encounter.period;
    const typeCoding = encounter.type?.[0]?.coding?.[0];
    return await this.mergeVertexRow(
      ['encounter_id'],
      {
        encounter_id: encounter.id,
        patient_id: extractId(encounter.subject),
        period_start: validDate(period?.start) ?? null,
        period_end: validDate(period?.end) ?? null,
        class_code: encounter.class?.code ?? null,
        class_display: encounter.class?.display ?? null,
        type_code: typeCoding?.code ?? null,
        type_display: typeCoding?.display ?? null,
      },
      ctx
    );
  }
}

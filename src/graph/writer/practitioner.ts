import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from 'graph/writer/base';
import { firstFullName } from 'fhir/humanName';
import { R4_Practitioner, R4Practitioner } from 'fhir/practitioner';

export class PractitionerWriter extends BaseWriter<R4Practitioner> {
  constructor(pool: OraclePool) {
    super(pool, 'Practitioner', 'kg_practitioner', R4_Practitioner);
  }

  async delete(
    practitioner: R4Practitioner,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.deleteVertexRows(
      'practitioner_id = :id',
      { id: practitioner.id },
      ctx
    );
  }

  async merge(
    practitioner: R4Practitioner,
    ctx: HandlerContext
  ): Promise<void> {
    return await this.mergeVertexRow(
      ['practitioner_id'],
      {
        practitioner_id: practitioner.id,
        name: firstFullName(practitioner.name),
      },
      ctx
    );
  }
}

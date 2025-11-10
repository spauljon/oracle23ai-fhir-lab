import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from 'graph/writer/base';
import { R4_Organization, R4Organization } from 'fhir/organization';

export class OrganizationWriter extends BaseWriter<R4Organization> {
  constructor(pool: OraclePool) {
    super(pool, 'Organization', 'kg_organization', R4_Organization);
  }

  async delete(
    organization: R4Organization,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.deleteVertexRows(
      'org_id = :id',
      { id: organization.id },
      ctx
    );
  }

  async merge(
    organization: R4Organization,
    ctx: HandlerContext
  ): Promise<void> {
    return await this.mergeVertexRow(
      ['org_id'],
      {
        org_id: organization.id,
        name: organization.name,
        type: organization.type?.[0]?.coding?.[0]?.code,
      },
      ctx
    );
  }
}

import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from 'graph/writer/base';
import { R4_Location, R4Location } from 'fhir/location';

export class LocationWriter extends BaseWriter<R4Location> {
  constructor(pool: OraclePool) {
    super(pool, 'Location', 'kg_location', R4_Location);
  }

  async delete(location: R4Location, ctx: HandlerContext): Promise<number> {
    return await this.deleteVertexRows(
      'location_id = :id',
      { id: location.id },
      ctx
    );
  }

  async merge(location: R4Location, ctx: HandlerContext): Promise<void> {
    return await this.mergeVertexRow(
      ['location_id'],
      {
        location_id: location.id,
        name: location.name,
        type: location.type?.[0]?.coding?.[0]?.code,
      },
      ctx
    );
  }
}

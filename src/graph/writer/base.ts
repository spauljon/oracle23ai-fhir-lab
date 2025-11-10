import {
  GraphedFHIRResourceTypes,
  HandlerContext,
  PropertyGraphWriter,
} from 'graph/types';
import { OraclePool } from 'oracle/pool';
import { FhirMessage, ResourceType } from 'types';
import { ZodType } from 'zod';
import { Dao } from './dao';

export abstract class BaseWriter<TResource extends GraphedFHIRResourceTypes>
  implements PropertyGraphWriter
{
  readonly resourceType: ResourceType;
  protected readonly schema: ZodType<TResource>;
  protected readonly tableName: string;
  protected readonly oracleSchema: string = 'fhir_graph';
  protected readonly dao: Dao;

  protected constructor(
    pool: OraclePool,
    resourceType: ResourceType,
    tableName: string,
    schema: ZodType<TResource>
  ) {
    this.dao = new Dao(pool);
    this.resourceType = resourceType;
    this.tableName = tableName;
    this.schema = schema;
  }

  write = async (msg: FhirMessage, ctx: HandlerContext): Promise<void> => {
    if (!msg) {
      ctx.logger.warn('message discarded');

      return;
    }

    const result = this.schema.safeParse(msg.resource);

    if (result.success) {
      if (msg.op === 'delete') {
        await this.delete(result.data, ctx);
      } else {
        await this.merge(result.data, ctx);
      }
    } else {
      ctx.logger.warn(
        {
          resource: msg.resource,
          errors: result.error.issues,
          resourceType: this.resourceType,
        },
        `Validation failed for ${this.resourceType}, discarded`
      );
    }
  };

  protected abstract delete(
    resource: TResource,
    ctx: HandlerContext
  ): Promise<number>;

  protected async deleteVertexRows<T extends Record<string, any>>(
    qualifier: string,
    bindParams: T,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.dao.delete(
      this.oracleSchema,
      this.tableName,
      qualifier,
      bindParams,
      ctx
    );
  }

  protected abstract merge(
    resource: TResource,
    ctx: HandlerContext
  ): Promise<void>;

  protected async mergeVertexRow<T extends Record<string, any>>(
    keyColumns: string[],
    data: T,
    ctx: HandlerContext
  ): Promise<void> {
    await this.mergeRow(this.tableName, keyColumns, data, ctx);
  }

  protected async mergeRow<T extends Record<string, any>>(
    table: string,
    keyColumns: string[],
    data: T,
    ctx: HandlerContext
  ): Promise<void> {
    await this.dao.merge(this.oracleSchema, table, keyColumns, data, ctx);
  }
}

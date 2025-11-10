import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { isDefined } from 'system';
import OracleDB from 'oracledb';

export class Dao {
  private readonly pool: OraclePool;

  constructor(pool: OraclePool) {
    this.pool = pool;
  }

  async delete<T extends Record<string, any>>(
    schema: string,
    table: string,
    qualifier: string,
    bindParams: T,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.pool.execute<number>(async (conn) => {
      const result = await conn.execute(
        `delete from ${schema}.${table} where ${qualifier}`,
        bindParams,
        { autoCommit: true }
      );

      const rows = result.rowsAffected || 0;

      ctx.logger.info(
        { qualifier: qualifier, bindParams: bindParams },
        `deleted ${rows} rows from ${table}`
      );

      return rows;
    });
  }

  async merge<T extends Record<string, any>>(
    schema: string,
    table: string,
    keyColumns: string[],
    data: T,
    ctx: HandlerContext
  ): Promise<void> {
    await this.pool.execute<void>(async (conn) => {
      const onConditions = keyColumns
        .map((k) => `t.${k} = :${k}`)
        .join(' AND ');

      const updateColumns = Object.keys(data)
        .filter((k) => !keyColumns.includes(k))
        .map((k) => `t.${k} = :${k}`)
        .join(', ');

      const matchedClause = updateColumns ? `
when matched then update set ${updateColumns}`
        : '';

      const props = Object.keys(data).filter((k) =>
        isDefined(data[k])
      );
      const insertColumns = props.join(', ');
      const insertValues = props.map((k) => `:${k}`).join(', ');

      const sql = `
merge into ${schema}.${table} t
on (${onConditions}) ${matchedClause}
when not matched then
  insert (${insertColumns})
  values (${insertValues})
    `;
      await this.executeAndLog(conn, table, sql, data, 'merge', ctx);
    });
  }

  async insert<T extends Record<string, any>>(
    schema: string,
    table: string,
    data: T,
    ctx: HandlerContext
  ): Promise<void> {
    await this.pool.execute<void>(async (conn) => {
      const props = Object.keys(data).filter((k) => isDefined(data[k]));
      const values = props.map((k) => `:${k}`).join(', ');
      const sql = `insert into ${schema}.${table}(${props.join(', ')}) values (${values})`;

      await this.executeAndLog(conn, table, sql, data, 'insert', ctx);
    });
  }

  private async executeAndLog<T extends Record<string, any>>(
    conn: OracleDB.Connection,
    table: string,
    sql: string,
    data: T,
    action: string,
    ctx: HandlerContext
  ) {
    try {
      await conn.execute(sql, data, { autoCommit: true });

      ctx.logger.info({ table: table, data }, `applied ${action} to ${table}`);
    } catch (e: unknown) {
      ctx.logger.error(
        { error: e, table: table, sql, data },
        `${table} ${action} failed`
      );
    }
  }
}

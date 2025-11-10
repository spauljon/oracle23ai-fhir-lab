import { BaseHandler } from '@consumer-handler/base';
import { Logger } from 'pino';
import { applyTransforms } from '@vector-handler/transforms';
import oracledb, { BindParameters, Connection } from 'oracledb';
import { OraclePool } from 'oracle/pool';
import { VectorColumnType } from '@vector-handler/types';
import { R4Observation } from 'fhir/observation';

export class VectorDbHandler extends BaseHandler {
  private readonly pool: OraclePool;

  constructor(log: Logger) {
    super(log);

    this.pool = new OraclePool(log);
  }
  onMessage = async (
    data: Uint8Array,
    meta: { seq: number; subject: string }
  ): Promise<void> => {
    const message = this.decodeMessage(data, meta);

    if (!message) {
      this.log.warn(meta, 'message discarded');
      return;
    }

    if (message.op === 'delete') {
      this.deleteRows(message.parsed!.id!);
    } else if (message.parsed) {
      await this.writeRows(message.parsed);
    }
  };

  close = async () => {
    await this.pool.close();
  };
  select = async (sql: string, bindVariables: any): Promise<void> => {
    await this.pool.execute<void>(async (conn) => {
      try {
        const result = await conn.execute(sql, bindVariables, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        console.table(result.rows);
      } catch (e: any) {
        this.log.error(e);
      }
    });
  };
  private readonly deleteRows = async (observationId: string) => {
    await this.pool.execute<void>(async (conn) => {
      try {
        await conn.execute(
          'delete from fhir_vec.obs_vec_active where observation_id = :id',
          { id: observationId },
          { autoCommit: true }
        );

        this.log.info(
          { id: observationId },
          'deleted vector table rows for observation id'
        );
      } catch (e: any) {
        this.log.error(e);
      }
    });
  };
  private readonly writeRows = async (observation: R4Observation) => {
    const paramArr = await applyTransforms(observation);

    for (const params of paramArr) {
      await this.pool.execute<void>(async (conn) => {
        try {
          await this.callProcedure(conn, params);

          this.log.info({ id: params.observationId }, 'wrote vector table row');
        } catch (e: any) {
          if (
            e.errorNum === 1 &&
            e.message.startsWith('ORA-00001: unique constraint')
          ) {
            this.log.error('encountered dup violation; ignoring');
          } else {
            this.log.error(e);
          }
        }
      });
    }
  };

  private readonly callProcedure = async (
    conn: Connection,
    params: Record<string, VectorColumnType>
  ): Promise<void> => {
    await conn.execute(
      `
    BEGIN
      fhir_vec.obs_vec_merge(
        :p_observation_id,
        :p_patient_id,
        to_timestamp_tz(:p_effective_start, 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'),
        to_timestamp_tz(:p_effective_end,   'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM'),
        :p_code_text,
        :p_value_text,
        :p_display_text,
        :p_embedding,
        :p_text_sha256
      );
    END;`,
      {
        p_observation_id: params.observationId,
        p_patient_id: params.patientId,
        p_effective_start: params.effectiveStart,
        p_effective_end: params.effectiveEnd,
        p_code_text: params.codeText,
        p_value_text: params.valueText,
        p_display_text: params.displayText,
        p_embedding: {
          type: oracledb.DB_TYPE_VECTOR,
          val: params.embedding,
        },
        p_text_sha256: params.textSha256,
      } as BindParameters,
      { autoCommit: true } // or manage a transaction as you prefer
    );
  };
}

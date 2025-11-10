import oracledb, { Pool, Connection, PoolAttributes } from 'oracledb';
import { Logger } from 'pino';
import { LoggerFactory } from 'log';

const _poolConfig = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASS!,
  connectString: 'localhost:1521/pdbfhirai',
};

export class OraclePool {
  private pool?: Pool;
  private isShuttingDown = false;

  constructor(private readonly log: Logger) {}

  async initialize(): Promise<void> {
    if (this.pool) {
      this.log.warn('Pool already initialized');
      return;
    }

    try {
      const poolConfig: PoolAttributes = {
        user: _poolConfig.user,
        password: _poolConfig.password,
        connectString: _poolConfig.connectString,
      };

      this.pool = await oracledb.createPool(poolConfig);

      this.log.info(
        {
          poolMin: poolConfig.poolMin,
          poolMax: poolConfig.poolMax,
          connectString: _poolConfig.connectString,
        },
        'Oracle connection pool created'
      );

      // Register shutdown handlers
      this.registerShutdownHandlers();
    } catch (error) {
      this.log.error({ error }, 'Failed to create Oracle connection pool');
      throw error;
    }
  }

  private async getConnection(): Promise<Connection> {
    if (!this.pool) {
      await this.initialize();
    }

    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down. Cannot get new connections.');
    }

    try {
      const conn = await this.pool!.getConnection();
      this.log.debug('Connection acquired from pool');
      return conn;
    } catch (error) {
      this.log.error({ error }, 'Failed to get connection from pool');
      throw error;
    }
  }

  async execute<T>(callback: (conn: Connection) => Promise<T>): Promise<T> {
    const conn = await this.getConnection();
    try {
      return await callback(conn);
    } finally {
      try {
        await conn.close();
        this.log.debug('Connection released to pool');
      } catch (error) {
        this.log.error({ error }, 'Error releasing connection');
      }
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      this.log.warn('Pool not initialized or already closed');
      return;
    }

    if (this.isShuttingDown) {
      this.log.warn('Pool is already shutting down');
      return;
    }

    this.isShuttingDown = true;

    try {
      await this.pool.close(10); // 10 second drain time
      this.log.info('Oracle connection pool closed');
      // @ts-ignore
      this.pool = undefined;
    } catch (error) {
      this.log.error({ error }, 'Error closing Oracle connection pool');
      throw error;
    }
  }
  private registerShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.log.info({ signal }, 'Received shutdown signal');
      try {
        await this.close();
        process.exit(0);
      } catch (error) {
        this.log.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('beforeExit', () => shutdown('beforeExit'));
  }
}

const log = LoggerFactory.create();

export const sharedPool = new OraclePool(log);

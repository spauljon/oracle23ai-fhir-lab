import {
  connect,
  Consumer,
  ConsumerMessages,
  JetStreamClient,
  NatsConnection,
} from 'nats';
import { AppConfig } from './config';
import type { Logger } from 'pino';

/** -----------------------------------------------------------
 * JetStream wrapper (connection + consumer lifecycle)
 * ---------------------------------------------------------- */
export class JetStreamService {
  private nc!: NatsConnection;
  private js!: JetStreamClient;
  private consumer!: Consumer;
  private sub?: ConsumerMessages;
  private shuttingDown = false; // <— add a flag

  constructor(private readonly cfg: AppConfig, private readonly log: Logger) {}

  async connect(): Promise<void> {
    this.nc = await connect({ servers: this.cfg.natsUrl });
    this.log.info({ server: this.cfg.natsUrl }, 'Connected to NATS');
    this.js = this.nc.jetstream();
  }

  /** Ensure stream & durable exist (info will throw if missing). */
  async assertTopology(): Promise<void> {
    const jsm = await this.nc.jetstreamManager();
    const streamInfo   = await jsm.streams.info(this.cfg.stream);
    const consumerInfo = await jsm.consumers.info(this.cfg.stream, this.cfg.durable);

    this.log.info(streamInfo, 'stream info');
    this.log.info(consumerInfo, 'Consumer ready');
  }

  async getConsumer(): Promise<void> {
    this.consumer = await this.js.consumers.get(this.cfg.stream, this.cfg.durable);
  }

  /** Start a continuous consume() stream. */
  async startConsuming(
    onMessage: (data: Uint8Array, meta: { seq: number; subject: string }) => Promise<void> | void
  ): Promise<void> {
    this.sub = await this.consumer.consume();

    try {
      for await (const m of this.sub) {
        try {
          await onMessage(m.data, { seq: m.seq, subject: m.subject });
        } catch (err) {
          this.log.error({ err, seq: m.seq }, 'Handler error');
        } finally {
          m.ack();
        }
        if (this.shuttingDown) break;
      }
    } catch (err) {
      // consume() throws when closed; report only if we weren't shutting down
      if (!this.shuttingDown) {
        this.log.error({ err }, 'Consumer stream error');
      }
    }
  }

  /** Stop the consume() iterator, drain the connection. */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    this.log.info('Shutting down…');
    try { await this.sub?.close(); } catch {}
    try { await this.nc.drain(); } catch {}
  }
}
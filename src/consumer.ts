import 'dotenv/config';
import pino, { type Logger } from 'pino';
import {
  connect,
  type Consumer,
  type ConsumerMessages,
  type JetStreamClient,
  type NatsConnection,
} from 'nats';

/** -----------------------------------------------------------
 * Logger
 * ---------------------------------------------------------- */
class LoggerFactory {
  static create(): Logger {
    return pino({
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: true, hideObject: false } },
      level: process.env.LOG_LEVEL ?? 'info',
    });
  }
}

/** -----------------------------------------------------------
 * App configuration
 * ---------------------------------------------------------- */
class AppConfig {
  readonly natsUrl: string;
  readonly stream: string;
  readonly durable: string;

  constructor(env = process.env) {
    this.natsUrl = env.NATS_URL ?? 'nats://localhost:4222';
    this.stream  = env.NATS_STREAM ?? 'FHIR';
    this.durable = env.NATS_DURABLE ?? 'vecdb';
  }
}

/** -----------------------------------------------------------
 * JetStream wrapper (connection + consumer lifecycle)
 * ---------------------------------------------------------- */
class JetStreamService {
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

/** -----------------------------------------------------------
 * Message handler (Step-1: echo only)
 * ---------------------------------------------------------- */
class EchoHandler {
  private readonly td = new TextDecoder(); // <— reuse decoder

  constructor(private readonly log: Logger) {}

  handle = (data: Uint8Array, meta: { seq: number; subject: string }) => {
    const raw = this.td.decode(data);
    try {
      const parsed = JSON.parse(raw);
      this.log.info({ seq: meta.seq, subject: meta.subject, ...parsed }, 'NATS message');
    } catch {
      this.log.info({ seq: meta.seq, subject: meta.subject, raw }, 'NATS message (non-JSON)');
    }
  };
}

/** -----------------------------------------------------------
 * Application orchestrator
 * ---------------------------------------------------------- */
class NatsEchoApp {
  private readonly log = LoggerFactory.create();
  private readonly cfg = new AppConfig();
  private readonly svc = new JetStreamService(this.cfg, this.log);
  private readonly handler = new EchoHandler(this.log);

  async run(): Promise<void> {
    await this.svc.connect();
    await this.svc.assertTopology();
    await this.svc.getConsumer();

    const onSignal = async () => {
      await this.svc.shutdown();
      process.exit(0);
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    await this.svc.startConsuming(this.handler.handle);
  }
}

/** -----------------------------------------------------------
 * Bootstrap
 * ---------------------------------------------------------- */
await new NatsEchoApp()
  .run()
  .catch(async (err) => {
    const log = LoggerFactory.create();
    log.error({ err }, 'Fatal error');
    process.exit(1);
  });

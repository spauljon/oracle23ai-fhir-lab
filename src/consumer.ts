import 'dotenv/config';
import { connect, NatsConnection } from 'nats';
import pino from 'pino';

const log = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: true, hideObject: false },
  },
  level: process.env.LOG_LEVEL ?? 'info',
});

// ---- Env ----
const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';
const STREAM = process.env.NATS_STREAM ?? 'FHIR';
const DURABLE = process.env.NATS_DURABLE ?? 'vecdb';

async function ensureConsumer(nc: NatsConnection) {
  const jsm = await nc.jetstreamManager();

  let streamInfo = await jsm.streams.info(STREAM);

  log.info(streamInfo, 'stream info');

  const consumerInfo = await jsm.consumers.info(STREAM, DURABLE);

  log.info(consumerInfo, 'Consumer ready');
}

async function main() {
  const auth = {};
  const nc = await connect({ servers: NATS_URL, ...auth });

  log.info({ server: NATS_URL }, 'Connected to NATS');

  const js = nc.jetstream();

  await ensureConsumer(nc); // make sure durable "vecdb" exists

  const consumer = await js.consumers.get(STREAM, DURABLE);

  const sub = await consumer.consume(); // optional opts: { max_messages, expires, callback }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;

    shuttingDown = true;

    log.info('Shutting down...');

    try {
      await sub.close();
    } catch {}

    try {
      await nc.drain();
    } catch {}

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const td = new TextDecoder();

  try {
    for await (const m of sub) {
      const raw = td.decode(m.data);
      try {
        const parsed = JSON.parse(raw);
        log.info({ seq: m.seq, subject: m.subject, ...parsed }, 'NATS message');
      } catch {
        log.info(
          { seq: m.seq, subject: m.subject, raw },
          'NATS message (non-JSON)'
        );
      }
      m.ack();
      if (shuttingDown) break;
    }
  } catch (err) {
    if (!shuttingDown) log.error({ err }, 'Consumer stream error');
  } finally {
    await shutdown();
  }
}

await main().catch(async (err) => {
  log.error({ err }, 'Fatal error');
  process.exit(1);
});

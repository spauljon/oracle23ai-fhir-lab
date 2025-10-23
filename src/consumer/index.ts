import 'dotenv/config';
import { LoggerFactory } from './log';
import { JetStreamService } from './jetstream';
import { MessageHandler } from '@consumer/types';
import { VectorDbHandler } from '@handler/vectordb';

const log = LoggerFactory.create();

/** -----------------------------------------------------------
 * Application orchestrator
 * ---------------------------------------------------------- */
class FhirObservationConsumer {
  private readonly svc: JetStreamService;
  private readonly handler: MessageHandler;

  constructor(handler: MessageHandler) {
    this.handler = handler;
    this.svc = new JetStreamService(log);
  }

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

    await this.svc.startConsuming(this.handler.onMessage);
  }
}

/** -----------------------------------------------------------
 * Bootstrap
 * ---------------------------------------------------------- */
await new FhirObservationConsumer(new VectorDbHandler(log))
  .run()
  .catch(async (err) => {
    log.error({ err }, 'Fatal error');
    process.exit(1);
  });

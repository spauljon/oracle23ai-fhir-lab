import 'dotenv/config';
import { EchoHandler } from './handler/echo';
import { LoggerFactory } from './log';
import { AppConfig } from './config';
import { JetStreamService } from './jetstream';

/** -----------------------------------------------------------
 * Application orchestrator
 * ---------------------------------------------------------- */
class FhirObservationConsumer {
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
await new FhirObservationConsumer()
  .run()
  .catch(async (err) => {
    const log = LoggerFactory.create();
    log.error({ err }, 'Fatal error');
    process.exit(1);
  });

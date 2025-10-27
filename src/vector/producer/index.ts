// main.ts
import { PatientBackfill } from './backfill';
import { LoggerFactory } from '@vector-consumer/log';
import { JetStreamService } from '@vector-consumer/jetstream';
import { cfg } from '@/config';

const log = LoggerFactory.create();

class FhirObservationProducer {
  private readonly svc: JetStreamService;

  constructor() {
    this.svc = new JetStreamService(log);
  }

  async run(): Promise<void> {
    await this.svc.connect();
    await this.svc.assertTopology();

    const onSignal = async () => {
      await this.svc.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    const backfill = new PatientBackfill(
      this.svc.js,
      '11331',
      cfg.fhirBase,
      cfg.subject,
      500
    );

    await backfill.run();
  }
}

await new FhirObservationProducer().run().catch(async (err) => {
  log.error({ err }, 'Fatal error');
  process.exit(1);
});

import { MessageHandler } from 'types';
import { JetStreamService } from '@vector-consumer/jetstream';
import { LoggerFactory } from 'log';

const log = LoggerFactory.create();

export class FhirMessageConsumer {
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


import 'dotenv/config';
import { LoggerFactory } from 'log';
import { DispatchHandler } from './handler/dispatch';
import { FhirMessageConsumer } from 'consumer';

const log = LoggerFactory.create();

/** -----------------------------------------------------------
 * Bootstrap
 * ---------------------------------------------------------- */
await new FhirMessageConsumer(new DispatchHandler(log))
  .run()
  .catch(async (err) => {
    log.error({ err }, 'Fatal error');
    process.exit(1);
  });

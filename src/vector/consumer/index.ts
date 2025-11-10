import 'dotenv/config';
import { LoggerFactory } from 'log';
import { BaseHandler } from '@consumer-handler/base';
import { FhirMessageConsumer } from 'consumer';

const log = LoggerFactory.create();

/** -----------------------------------------------------------
 * Bootstrap
 * ---------------------------------------------------------- */
await new FhirMessageConsumer(new BaseHandler(log)).run().catch(async (err) => {
  log.error({ err }, 'Fatal error');
  process.exit(1);
});

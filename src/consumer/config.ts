/** -----------------------------------------------------------
 * App configuration
 * ---------------------------------------------------------- */
export class AppConfig {
  readonly natsUrl: string;
  readonly stream: string;
  readonly durable: string;

  constructor(env = process.env) {
    this.natsUrl = env.NATS_URL ?? 'nats://localhost:4222';
    this.stream = env.NATS_STREAM ?? 'FHIR';
    this.durable = env.NATS_DURABLE ?? 'vecdb';
  }
}

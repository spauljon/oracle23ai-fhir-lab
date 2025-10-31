import 'dotenv/config';

/** -----------------------------------------------------------
 * App configuration
 * ---------------------------------------------------------- */
export class AppConfig {
  readonly fhirBase: string;
  readonly natsUrl: string;
  readonly stream: string;
  readonly durable: string;
  readonly subject: string;

  constructor(env = process.env) {
    this.fhirBase = env.FHIR_BASE ?? 'http://localhost:8080/fhir';
    this.natsUrl = env.NATS_URL ?? 'nats://localhost:4222';
    this.stream = env.NATS_STREAM ?? 'fhir';
    this.durable = env.NATS_DURABLE ?? 'fhir-rag-consumer';
    this.subject = env.NATS_SUBJECT ?? 'fhir.obs.vector';
  }
}

export const cfg: AppConfig = new AppConfig();

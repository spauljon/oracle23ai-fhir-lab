import { JetStreamClient, JSONCodec } from 'nats';
import { FhirMessage } from 'types';
import { R4Observation } from 'fhir/observation';
import { isDefined } from '../../system';

interface FhirBundleLink {
  relation: string;
  url: string;
}

interface FhirBundleEntry {
  resource?: R4Observation;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  entry?: FhirBundleEntry[];
  link?: FhirBundleLink[];
}

// @ts-ignore
const graphResourceTypes: Set<string> = new Set([
  'Patient',
  'Observation',
  'Encounter',
  'Condition',
  'Procedure',
  'MedicationRequest',
  'MedicationAdministration',
  'Practitioner',
  'Organization',
  'Location'
]);

/**
 * PatientBackfill performs a one-time FHIR search for all resources belonging to
 * a specific patient and publishes each supported resource to a NATS JetStream subject.
 */
export class PatientResourceBackfill {
  private readonly js: JetStreamClient;
  private readonly patientId: string;
  private readonly fhirBase: string;
  private readonly subject: string;
  private readonly pageSize: number;
  private readonly jc = JSONCodec();

  constructor(
    js: JetStreamClient,
    patientId: string,
    fhirBase: string,
    subject: string,
    pageSize = 10000
  ) {
    this.js = js;
    this.patientId = patientId;
    this.fhirBase = fhirBase.endsWith('/') ? fhirBase.slice(0, -1) : fhirBase;
    this.subject = subject;
    this.pageSize = pageSize;
  }

  public async run(): Promise<void> {
    let url: string | null =
      `${this.fhirBase}/Patient/11331/$everything?_count=${this.pageSize}`;

    let sent = 0;
    const started = Date.now();

    while (url) {
      const bundle = await this.fetchBundle(url);

      for (const res of this.extractResources(bundle)) {
        const message: FhirMessage = {
          op: 'create',
          resourceType: res.resourceType,
          resource: JSON.stringify(res),
        };
        await this.js.publish(this.subject, this.jc.encode(message));
        sent++;
        if (sent % 10 === 0) {
          const rate = (sent * 1000) / Math.max(1, Date.now() - started);
          process.stdout.write(
            `\r[${this.patientId}] published ${sent} resources (${rate.toFixed(1)}/s)`
          );
        }
      }

      url = this.nextLink(bundle);
    }

    const rate = (sent * 1000) / Math.max(1, Date.now() - started);
    console.log(
      `\n[${this.patientId}] DONE — ${sent} resources (${rate.toFixed(
        1
      )}/s avg)`
    );
  }

  // ---------- private helpers ----------

  private async fetchBundle(url: string): Promise<FhirBundle> {
    const headers: Record<string, string> = {
      accept: 'application/fhir+json',
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`FHIR ${res.status} ${res.statusText} — ${url}`);
    }
    return (await res.json()) as FhirBundle;
  }

  private *extractResources(bundle: FhirBundle): Iterable<R4Observation> {
    for (const e of bundle.entry ?? []) {
      const r = e.resource;
      if (isDefined(r?.resourceType) && graphResourceTypes.has(r?.resourceType)) {
        yield r;
      }
    }
  }

  private nextLink(bundle: FhirBundle): string | null {
    const next = bundle.link?.find((l) => l.relation === 'next');
    return next?.url ?? null;
  }
}

import { JetStreamClient, JSONCodec } from 'nats';
import {  FhirMessage } from 'types';
import { R4Observation } from 'fhir/observation';

interface FhirBundleLink {
  relation: string;
  url: string;
}

interface FhirBundleEntry {
  resource?: R4Observation;
}

export interface FhirBundle {
  resourceType: "Bundle";
  entry?: FhirBundleEntry[];
  link?: FhirBundleLink[];
}

/**
 * PatientBackfill performs a one-time FHIR search for Observations belonging to
 * a specific patient and publishes each Observation resource to a NATS JetStream subject.
 */
export class PatientBackfill {
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
    pageSize = 1000
  ) {
    this.js = js;
    this.patientId = patientId;
    this.fhirBase = fhirBase.endsWith('/') ? fhirBase.slice(0, -1) : fhirBase;
    this.subject = subject;
    this.pageSize = pageSize;
  }

  /** Executes the backfill process. */
  public async run(): Promise<void> {
    let url: string | null =
      `${this.fhirBase}/Observation?subject=Patient/${encodeURIComponent(
        this.patientId
      )}&_count=${this.pageSize}`;

    let sent = 0;
    const started = Date.now();

    while (url) {
      const bundle = await this.fetchBundle(url);

      for (const obs of this.extractObservations(bundle)) {
        const message: FhirMessage = {
          op: 'create',
          resourceType: 'Observation',
          resource: JSON.stringify(obs),
        }
        await this.js.publish(this.subject, this.jc.encode(message));
        sent++;
        if (sent % 10 === 0) {
          const rate = (sent * 1000) / Math.max(1, Date.now() - started);
          process.stdout.write(
            `\r[${this.patientId}] published ${sent} obs (${rate.toFixed(1)}/s)`
          );
        }
      }

      url = null; //this.nextLink(bundle);
    }

    const rate = (sent * 1000) / Math.max(1, Date.now() - started);
    console.log(
      `\n[${this.patientId}] DONE — ${sent} observations (${rate.toFixed(
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

  private *extractObservations(bundle: FhirBundle): Iterable<R4Observation> {
    for (const e of bundle.entry ?? []) {
      const r = e.resource;
      if (r?.resourceType === 'Observation' && r.id) {
        yield r;
      }
    }
  }

  // @ts-ignore
  private nextLink(bundle: FhirBundle): string | null {
    const next = bundle.link?.find((l) => l.relation === 'next');
    return next?.url ?? null;
  }
}

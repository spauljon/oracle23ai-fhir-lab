import type { Logger } from 'pino';

/** -----------------------------------------------------------
 * Message handler (Step-1: echo only)
 * ---------------------------------------------------------- */
export class EchoHandler {
  private readonly td = new TextDecoder(); // <— reuse decoder

  constructor(private readonly log: Logger) {}

  handle = (data: Uint8Array, meta: { seq: number; subject: string }) => {
    const raw = this.td.decode(data);
    try {
      const parsed = JSON.parse(raw);

      // Normalize observation: it might be a JSON string or an object, or absent
      let observation = this.parseObservation(parsed.observation, parsed);

      this.log.info(
        {
          seq: meta.seq,
          subject: meta.subject,
          operation: parsed.op,
          observation: observation,
        },
        'NATS message'
      );
    } catch {
      this.log.info(
        { seq: meta.seq, subject: meta.subject, raw },
        'NATS message (non-JSON)'
      );
    }
  };

  private parseObservation(observation: unknown, parsed: any) {
    if (typeof observation === 'string') {
      try {
        return JSON.parse(parsed.observation);
      } catch (e) {
        this.log.error(e);

        return {
          _raw: parsed.observation,
          _error: 'invalid observation JSON',
        };
      }
    }

    return observation;
  }
}

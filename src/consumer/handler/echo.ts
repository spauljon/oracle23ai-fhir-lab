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

      parsed.observation = JSON.parse(parsed['observation']);

      this.log.info(
        { seq: meta.seq, subject: meta.subject, ...parsed },
        'NATS message'
      );
    } catch {
      this.log.info(
        { seq: meta.seq, subject: meta.subject, raw },
        'NATS message (non-JSON)'
      );
    }
  };


}

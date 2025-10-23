import type { Logger } from 'pino';
import {
  FhirMessage,
  FhirMessageSchema,
  MessageHandler,
  R4_Observation,
} from '@consumer/types';

/** -----------------------------------------------------------
 * Message handler (Step-1: echo only)
 * ---------------------------------------------------------- */
export class BaseHandler implements MessageHandler {
  private readonly td = new TextDecoder(); // <— reuse decoder

  constructor(protected readonly log: Logger) {}

  onMessage = async (
    data: Uint8Array,
    meta: { seq: number; subject: string }
  ): Promise<void> => {
    this.decodeMessage(data, meta);
  };

  protected decodeMessage = (
    data: Uint8Array<ArrayBufferLike>,
    meta: { seq: number; subject: string }
  ): FhirMessage | undefined => {
    const raw = this.td.decode(data);

    try {
      const message = FhirMessageSchema.parse(JSON.parse(raw));

      message.parsed = R4_Observation.parse(JSON.parse(message.observation));

      this.log.debug(
        {
          seq: meta.seq,
          subject: meta.subject,
          operation: message.op,
          observation: message.parsed,
        },
        'NATS message'
      );

      return message;
    } catch (error) {
      this.log.error(
        { seq: meta.seq, subject: meta.subject, raw, error },
        'NATS message error'
      );
    }

    return undefined;
  };
}

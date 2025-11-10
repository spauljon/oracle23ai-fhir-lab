// handlers/dispatch.ts
import { BaseHandler } from 'consumer/handler/base';
import { LoggerFactory } from 'log';
import { writerRegistry } from 'graph/writer/registry';
import { HandlerContext } from 'graph/types';

const log = LoggerFactory.create();

const ctx: HandlerContext = {
  logger: log,
};

export class DispatchHandler extends BaseHandler {
  onMessage = async (
    data: Uint8Array,
    meta: { seq: number; subject: string }
  ) => {
    const msg = this.decodeMessage(data, meta);

    if (!msg) {
      ctx.logger.warn({ meta }, 'Undefined message, discarding');
      return;
    }

    const writer = writerRegistry.get(msg.resourceType);

    if (!writer) {
      ctx.logger.warn(
        {
          resourceType: msg.resourceType,
          resourceId: msg.resource?.id,
          meta
        },
        'No writer found for resource type, discarding'
      );
      return;
    }

    try {
      await writer.write(msg, ctx);
    } catch (e) {
      log.error(
        {
          error: e,
          resourceType: msg.resourceType,
          resourceId: msg.resource?.id,
          operation: msg.op,
          seq: meta.seq,
          subject: meta.subject,
        },
        'Graph dispatch handler encountered error; discarding message'
      );
    }
  };
}

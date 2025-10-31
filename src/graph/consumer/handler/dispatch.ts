// handlers/observation.ts
import { BaseHandler } from '@consumer/handler/base';
import { LoggerFactory } from '@/log';
import { writerRegistry } from '@/graph/consumer/handler/registry';
import { HandlerContext } from '@/types';

const log = LoggerFactory.create();

const ctx: HandlerContext = {
  logger: log,
}

export class DispatchHandler extends BaseHandler {
  onMessage = async (data: Uint8Array, meta: { seq: number; subject: string }) => {
    const msg = this.decodeMessage(data, meta);
    const writer = msg && writerRegistry.get(msg.resourceType);
    const warning = msg ? 'no writer' : 'undefined message';

    return writer ? writer.write(msg, ctx) : ctx.logger.warn(msg ?? { meta }, warning);
  };
}

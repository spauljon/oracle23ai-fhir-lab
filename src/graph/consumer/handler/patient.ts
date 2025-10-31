import { writerRegistry } from './registry';
import {
  FhirMessage,
  HandlerContext,
  PropertyGraphWriter,
} from '@/types';

export class PatientWriter implements PropertyGraphWriter {
  write = async (
    msg: FhirMessage,
    ctx: HandlerContext
  ): Promise<void> => {
    ctx.logger.info(msg, 'writing patient message');
  };
}

writerRegistry.register('Patient', new PatientWriter());

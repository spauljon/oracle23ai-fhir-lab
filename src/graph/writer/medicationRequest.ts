import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { extractId } from 'fhir/reference';
import { validDate } from 'date';
import {
  R4_MedicationRequest,
  R4MedicationRequest,
} from 'fhir/medicationRequest';

type MedicationRequestRow = {
  mr_id: string;
  patient_id: string | null;
  practitioner_id?: string | null | undefined;
  code?: string | null | undefined;
  display?: string | null | undefined;
  status?: string | null | undefined;
  authored_on?: Date | null | undefined;
};

export class MedicationRequestWriter extends BaseWriter<R4MedicationRequest> {
  constructor(pool: OraclePool) {
    super(pool, 'MedicationRequest', 'kg_med_request', R4_MedicationRequest);
  }

  async delete(
    medRequest: R4MedicationRequest,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.deleteVertexRows('mr_id = :id', { id: medRequest.id }, ctx);
  }

  async merge(
    medRequest: R4MedicationRequest,
    ctx: HandlerContext
  ): Promise<void> {
    const coding = medRequest.medicationCodeableConcept?.coding?.[0];
    const row: MedicationRequestRow = {
      mr_id: medRequest.id!,
      patient_id: extractId(medRequest.subject),
      practitioner_id: extractId(medRequest.requester),
      code: coding?.code,
      display: coding?.display,
      status: medRequest.status,
      authored_on: validDate(medRequest.authoredOn)
    };

    await this.mergeVertexRow(['mr_id'], row, ctx);
  }
}

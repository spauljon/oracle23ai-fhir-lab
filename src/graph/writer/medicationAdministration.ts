import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { BaseWriter } from './base';
import { extractId } from 'fhir/reference';
import { validDate } from 'date';
import {
  R4_MedicationAdministration,
  R4MedicationAdministration,
} from 'fhir/medicationAdministration';

type MedicationAdministrationRow = {
  ma_id: string;
  patient_id: string | null;
  practitioner_id?: string | null | undefined;
  code?: string | null | undefined;
  effective_start: Date | null | undefined;
};

export class MedicationAdministrationWriter extends BaseWriter<R4MedicationAdministration> {
  constructor(pool: OraclePool) {
    super(
      pool,
      'MedicationAdministration',
      'kg_med_admin',
      R4_MedicationAdministration
    );
  }

  async delete(
    medAdmin: R4MedicationAdministration,
    ctx: HandlerContext
  ): Promise<number> {
    return await this.deleteVertexRows('ma_id = :id', { id: medAdmin.id }, ctx);
  }

  async merge(
    medAdmin: R4MedicationAdministration,
    ctx: HandlerContext
  ): Promise<void> {
    const row: MedicationAdministrationRow = {
      ma_id: medAdmin.id!,
      patient_id: extractId(medAdmin.subject),
      practitioner_id: extractId(medAdmin.performer?.[0]?.actor),
      code: medAdmin.medicationCodeableConcept?.coding?.[0].code,
      effective_start: validDate(
        medAdmin.effectiveDateTime ?? medAdmin.effectivePeriod?.start
      ),
    };

    await this.mergeVertexRow(['ma_id'], row, ctx);
  }
}

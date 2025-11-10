import { OraclePool } from 'oracle/pool';
import { HandlerContext } from 'graph/types';
import { R4_Patient, R4Patient } from 'fhir/patient';
import { BaseWriter } from 'graph/writer/base';
import { toDateZeroTime } from 'date';
import { familyName, firstGivenName } from 'fhir/humanName';

export class PatientWriter extends BaseWriter<R4Patient> {
  constructor(pool: OraclePool) {
    super(pool, 'Patient', 'kg_patient', R4_Patient);
  }

  async delete(patient: R4Patient, ctx: HandlerContext): Promise<number> {
    return await this.deleteVertexRows(
      'patient_id = :id',
      { id: patient.id },
      ctx
    );
  }

  async merge(patient: R4Patient, ctx: HandlerContext): Promise<void> {
    return await this.mergeVertexRow(
      ['patient_id'],
      {
        patient_id: patient.id,
        birth_date: toDateZeroTime(patient.birthDate),
        gender: patient.gender ?? null,
        first_name: firstGivenName(patient.name),
        last_name: familyName(patient.name),
      },
      ctx
    );
  }
}

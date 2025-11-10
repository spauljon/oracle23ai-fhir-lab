import { Logger } from 'pino';
import { FhirMessage } from 'types';
import { R4Patient } from 'fhir/patient';
import { R4Observation } from 'fhir/observation';
import { R4Encounter } from 'fhir/encounter';
import { R4Condition } from 'fhir/condition';
import { R4Procedure } from 'fhir/procedure';
import { R4MedicationRequest } from 'fhir/medicationRequest';
import { R4MedicationAdministration } from 'fhir/medicationAdministration';
import { R4Practitioner } from 'fhir/practitioner';
import { R4Organization } from 'fhir/organization';
import { R4Location } from 'fhir/location';

export type HandlerContext = {
  logger: Logger;
};

export interface PropertyGraphWriter {
  /**
   * Called for messages of the registered resourceType
   */
  write(msg: FhirMessage, ctx: HandlerContext): Promise<void>;
}

export type GraphedFHIRResourceTypes =
  | R4Patient
  | R4Observation
  | R4Encounter
  | R4Condition
  | R4Procedure
  | R4MedicationRequest
  | R4MedicationAdministration
  | R4Practitioner
  | R4Organization
  | R4Location
  ;

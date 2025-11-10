// registry.ts
import { ResourceType } from 'types';
import { PropertyGraphWriter } from 'graph/types';
import { sharedPool } from 'oracle/pool';
import { PatientWriter } from './patient';
import { EncounterWriter } from './encounter';
import { ObservationWriter } from 'graph/writer/observation';
import { ConditionWriter } from 'graph/writer/condition';
import { ProcedureWriter } from 'graph/writer/procedure';
import { MedicationRequestWriter } from 'graph/writer/medicationRequest';
import { MedicationAdministrationWriter } from 'graph/writer/medicationAdministration';
import { PractitionerWriter } from 'graph/writer/practitioner';
import { OrganizationWriter } from 'graph/writer/organization';
import { LocationWriter } from 'graph/writer/location';

export class WriteHandlerRegistry {
  private readonly map = new Map<ResourceType, PropertyGraphWriter>();
  private frozen = false;

  register(resourceType: ResourceType, handler: PropertyGraphWriter): void {
    if (this.frozen)
      throw new Error(`Registry is frozen; cannot register ${resourceType}`);
    if (this.map.has(resourceType)) {
      throw new Error(`Handler already registered for ${resourceType}`);
    }
    this.map.set(resourceType, handler);
  }

  get(resourceType: ResourceType): PropertyGraphWriter | undefined {
    return this.map.get(resourceType);
  }

  list(): string[] {
    return [...this.map.keys()];
  }

  has(resourceType: ResourceType): boolean {
    return this.map.has(resourceType);
  }

  size(): number {
    return this.map.size;
  }

  freeze(): void {
    this.frozen = true;
  }

  reset(): void {
    this.map.clear();
    this.frozen = false;
  }
}
export const writerRegistry = new WriteHandlerRegistry();

for (const Writer of [
  PatientWriter,
  EncounterWriter,
  ObservationWriter,
  ConditionWriter,
  ProcedureWriter,
  MedicationRequestWriter,
  MedicationAdministrationWriter,
  PractitionerWriter,
  OrganizationWriter,
  LocationWriter
]) {
  const writer = new Writer(sharedPool);

  writerRegistry.register(writer.resourceType, writer);
}

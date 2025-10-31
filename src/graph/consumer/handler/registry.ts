// registry.ts
import { PropertyGraphWriter, ResourceType } from '@/types';

export class WriteHandlerRegistry {
  private readonly map = new Map<ResourceType, PropertyGraphWriter>();
  private frozen = false;

  register(
    resourceType: ResourceType,
    handler: PropertyGraphWriter
  ): void {
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

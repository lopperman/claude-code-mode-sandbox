/**
 * Type definitions for MCP Memory Server
 *
 * These types mirror the @modelcontextprotocol/server-memory schema.
 * When an agent generates code using these wrappers, it gets full
 * type safety without needing the full tool definitions in context.
 */

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface EntityWithType extends Entity {
  type: 'entity';
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export interface RelationWithType extends Relation {
  type: 'relation';
}

export interface Graph {
  entities: EntityWithType[];
  relations: RelationWithType[];
}

export interface CreateEntityInput {
  name: string;
  entityType: string;
  observations: string[];
}

export interface CreateRelationInput {
  from: string;
  to: string;
  relationType: string;
}

export interface AddObservationInput {
  entityName: string;
  contents: string[];
}

export interface AddObservationResult {
  entityName: string;
  addedObservations: string[];
}

export interface DeleteObservationInput {
  entityName: string;
  observations: string[];
}

export interface SearchResult {
  entities: EntityWithType[];
  relations: RelationWithType[];
}

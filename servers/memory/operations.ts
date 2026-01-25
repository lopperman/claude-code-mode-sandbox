/**
 * Memory Server Tool Wrappers
 *
 * These functions provide a clean, typed API for memory operations.
 * When an agent generates code, it imports these functions and uses
 * them directly - no need to know about the underlying MCP protocol.
 *
 * Example usage in generated code:
 *
 *   import * as memory from './servers/memory';
 *
 *   const graph = await memory.readGraph();
 *   const active = graph.entities.filter(e =>
 *     e.observations.includes('status: active')
 *   );
 *   await memory.addObservations([
 *     { entityName: active[0].name, contents: ['processed: true'] }
 *   ]);
 */

import { callMCPTool } from './client.js';
import type {
  Graph,
  Entity,
  CreateEntityInput,
  CreateRelationInput,
  AddObservationInput,
  AddObservationResult,
  DeleteObservationInput,
  SearchResult,
} from './types.js';

/**
 * Read the entire knowledge graph
 *
 * @returns The complete graph with all entities and relations
 *
 * @example
 * const graph = await readGraph();
 * console.log(`Found ${graph.entities.length} entities`);
 */
export async function readGraph(): Promise<Graph> {
  return callMCPTool<Graph>('read_graph', {});
}

/**
 * Create multiple new entities in the knowledge graph
 *
 * @param entities - Array of entities to create
 * @returns The created entities
 *
 * @example
 * await createEntities([
 *   { name: 'Server1', entityType: 'Server', observations: ['status: active'] }
 * ]);
 */
export async function createEntities(
  entities: CreateEntityInput[]
): Promise<{ entities: Entity[] }> {
  return callMCPTool<{ entities: Entity[] }>('create_entities', { entities });
}

/**
 * Create relationships between entities
 *
 * @param relations - Array of relations to create
 * @returns The created relations
 *
 * @example
 * await createRelations([
 *   { from: 'Server1', to: 'Database1', relationType: 'connects_to' }
 * ]);
 */
export async function createRelations(
  relations: CreateRelationInput[]
): Promise<{ relations: CreateRelationInput[] }> {
  return callMCPTool<{ relations: CreateRelationInput[] }>('create_relations', { relations });
}

/**
 * Add observations to existing entities
 *
 * @param observations - Array of observations to add
 * @returns Results showing which observations were added
 *
 * @example
 * await addObservations([
 *   { entityName: 'Server1', contents: ['last_check: 2024-01-15', 'healthy: true'] }
 * ]);
 */
export async function addObservations(
  observations: AddObservationInput[]
): Promise<{ results: AddObservationResult[] }> {
  return callMCPTool<{ results: AddObservationResult[] }>('add_observations', { observations });
}

/**
 * Delete entities from the knowledge graph
 *
 * @param entityNames - Names of entities to delete
 * @returns Success status
 *
 * @example
 * await deleteEntities(['Server1', 'Server2']);
 */
export async function deleteEntities(
  entityNames: string[]
): Promise<{ success: boolean; message: string }> {
  return callMCPTool<{ success: boolean; message: string }>('delete_entities', { entityNames });
}

/**
 * Delete specific observations from entities
 *
 * @param deletions - Array specifying which observations to delete from which entities
 * @returns Success status
 *
 * @example
 * await deleteObservations([
 *   { entityName: 'Server1', observations: ['status: inactive'] }
 * ]);
 */
export async function deleteObservations(
  deletions: DeleteObservationInput[]
): Promise<{ success: boolean }> {
  return callMCPTool<{ success: boolean }>('delete_observations', { deletions });
}

/**
 * Delete relations from the knowledge graph
 *
 * @param relations - Relations to delete (must match exactly)
 * @returns Success status
 *
 * @example
 * await deleteRelations([
 *   { from: 'Server1', to: 'Database1', relationType: 'connects_to' }
 * ]);
 */
export async function deleteRelations(
  relations: CreateRelationInput[]
): Promise<{ success: boolean }> {
  return callMCPTool<{ success: boolean }>('delete_relations', { relations });
}

/**
 * Search for nodes matching a query
 *
 * Searches across entity names, types, and observation content.
 *
 * @param query - Search string to match
 * @returns Matching entities and their relations
 *
 * @example
 * const results = await searchNodes('active');
 * const activeServers = results.entities.filter(e => e.entityType === 'Server');
 */
export async function searchNodes(query: string): Promise<SearchResult> {
  return callMCPTool<SearchResult>('search_nodes', { query });
}

/**
 * Open specific nodes by their names
 *
 * @param names - Array of entity names to retrieve
 * @returns The requested entities
 *
 * @example
 * const result = await openNodes(['Server1', 'Server2']);
 * for (const entity of result.entities) {
 *   console.log(entity.name, entity.observations);
 * }
 */
export async function openNodes(names: string[]): Promise<SearchResult> {
  return callMCPTool<SearchResult>('open_nodes', { names });
}

/**
 * MCP Client interface for memory server
 *
 * This module provides the bridge between TypeScript wrappers and
 * actual MCP tool calls. In production, this would connect to the
 * MCP server via stdio or HTTP.
 *
 * For this experiment, we provide both:
 * 1. A mock client for testing without MCP
 * 2. An interface for real MCP integration
 */

import type {
  Graph,
  Entity,
  CreateEntityInput,
  CreateRelationInput,
  AddObservationInput,
  AddObservationResult,
  DeleteObservationInput,
  SearchResult,
  EntityWithType,
} from './types.js';

/**
 * Interface that any MCP client implementation must satisfy
 */
export interface MCPClientInterface {
  callTool<T>(toolName: string, params: Record<string, unknown>): Promise<T>;
}

/**
 * The active MCP client instance
 * Set this before using any memory operations
 */
let mcpClient: MCPClientInterface | null = null;

export function setMCPClient(client: MCPClientInterface): void {
  mcpClient = client;
}

export function getMCPClient(): MCPClientInterface {
  if (!mcpClient) {
    throw new Error(
      'MCP client not initialized. Call setMCPClient() first, or use MockMCPClient for testing.'
    );
  }
  return mcpClient;
}

/**
 * Helper to call MCP tools with proper typing
 */
export async function callMCPTool<T>(
  toolName: string,
  params: Record<string, unknown>
): Promise<T> {
  const client = getMCPClient();
  return client.callTool<T>(toolName, params);
}

/**
 * Mock MCP client for testing without actual MCP server
 * Stores data in memory, mimicking the real memory server behavior
 */
export class MockMCPClient implements MCPClientInterface {
  private entities: Map<string, EntityWithType> = new Map();
  private relations: Array<{ from: string; to: string; relationType: string }> = [];

  async callTool<T>(toolName: string, params: Record<string, unknown>): Promise<T> {
    switch (toolName) {
      case 'read_graph':
        return this.readGraph() as T;

      case 'create_entities':
        return this.createEntities(params.entities as CreateEntityInput[]) as T;

      case 'create_relations':
        return this.createRelations(params.relations as CreateRelationInput[]) as T;

      case 'add_observations':
        return this.addObservations(params.observations as AddObservationInput[]) as T;

      case 'delete_entities':
        return this.deleteEntities(params.entityNames as string[]) as T;

      case 'delete_observations':
        return this.deleteObservations(params.deletions as DeleteObservationInput[]) as T;

      case 'delete_relations':
        return this.deleteRelations(params.relations as CreateRelationInput[]) as T;

      case 'search_nodes':
        return this.searchNodes(params.query as string) as T;

      case 'open_nodes':
        return this.openNodes(params.names as string[]) as T;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private readGraph(): Graph {
    return {
      entities: Array.from(this.entities.values()),
      relations: this.relations.map(r => ({ ...r, type: 'relation' as const })),
    };
  }

  private createEntities(entities: CreateEntityInput[]): { entities: Entity[] } {
    const created: Entity[] = [];
    for (const entity of entities) {
      const entityWithType: EntityWithType = {
        type: 'entity',
        name: entity.name,
        entityType: entity.entityType,
        observations: [...entity.observations],
      };
      this.entities.set(entity.name, entityWithType);
      created.push(entity);
    }
    return { entities: created };
  }

  private createRelations(relations: CreateRelationInput[]): { relations: CreateRelationInput[] } {
    for (const relation of relations) {
      this.relations.push({ ...relation });
    }
    return { relations };
  }

  private addObservations(observations: AddObservationInput[]): { results: AddObservationResult[] } {
    const results: AddObservationResult[] = [];
    for (const obs of observations) {
      const entity = this.entities.get(obs.entityName);
      if (entity) {
        entity.observations.push(...obs.contents);
        results.push({
          entityName: obs.entityName,
          addedObservations: obs.contents,
        });
      }
    }
    return { results };
  }

  private deleteEntities(entityNames: string[]): { success: boolean; message: string } {
    for (const name of entityNames) {
      this.entities.delete(name);
      this.relations = this.relations.filter(r => r.from !== name && r.to !== name);
    }
    return { success: true, message: 'Entities deleted successfully' };
  }

  private deleteObservations(deletions: DeleteObservationInput[]): { success: boolean } {
    for (const deletion of deletions) {
      const entity = this.entities.get(deletion.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          o => !deletion.observations.includes(o)
        );
      }
    }
    return { success: true };
  }

  private deleteRelations(relations: CreateRelationInput[]): { success: boolean } {
    for (const rel of relations) {
      this.relations = this.relations.filter(
        r => !(r.from === rel.from && r.to === rel.to && r.relationType === rel.relationType)
      );
    }
    return { success: true };
  }

  private searchNodes(query: string): SearchResult {
    const matchingEntities = Array.from(this.entities.values()).filter(
      e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.entityType.toLowerCase().includes(query.toLowerCase()) ||
        e.observations.some(o => o.toLowerCase().includes(query.toLowerCase()))
    );
    return {
      entities: matchingEntities,
      relations: [],
    };
  }

  private openNodes(names: string[]): SearchResult {
    const entities = names
      .map(name => this.entities.get(name))
      .filter((e): e is EntityWithType => e !== undefined);
    return {
      entities,
      relations: [],
    };
  }

  // Utility method to load initial data (useful for testing)
  loadData(graph: Graph): void {
    this.entities.clear();
    this.relations = [];
    for (const entity of graph.entities) {
      this.entities.set(entity.name, entity);
    }
    for (const relation of graph.relations) {
      this.relations.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
      });
    }
  }
}

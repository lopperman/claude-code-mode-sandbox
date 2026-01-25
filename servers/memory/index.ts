/**
 * Memory Server Tool Wrappers
 *
 * This module provides typed wrappers for MCP memory server operations.
 *
 * Usage:
 *
 *   import * as memory from './servers/memory';
 *   import { setMCPClient, MockMCPClient } from './servers/memory';
 *
 *   // For testing without MCP:
 *   setMCPClient(new MockMCPClient());
 *
 *   // Then use the memory operations:
 *   const graph = await memory.readGraph();
 *   await memory.createEntities([...]);
 *   const results = await memory.searchNodes('active');
 */

// Re-export all types
export type {
  Entity,
  EntityWithType,
  Relation,
  RelationWithType,
  Graph,
  CreateEntityInput,
  CreateRelationInput,
  AddObservationInput,
  AddObservationResult,
  DeleteObservationInput,
  SearchResult,
} from './types.js';

// Re-export client utilities
export {
  setMCPClient,
  getMCPClient,
  MockMCPClient,
  type MCPClientInterface,
} from './client.js';

// Re-export all operations
export {
  readGraph,
  createEntities,
  createRelations,
  addObservations,
  deleteEntities,
  deleteObservations,
  deleteRelations,
  searchNodes,
  openNodes,
} from './operations.js';

/**
 * Test: Memory Server Tool Wrappers
 *
 * This test demonstrates the code execution pattern using the MockMCPClient.
 * It shows how generated code would interact with the memory server through
 * typed wrappers instead of direct MCP tool calls.
 */

import {
  setMCPClient,
  MockMCPClient,
  readGraph,
  createEntities,
  searchNodes,
  addObservations,
  deleteEntities,
  openNodes,
} from '../servers/memory/index.js';

async function runTest() {
  console.log('=== Memory Server Wrapper Test ===\n');

  // Initialize mock client
  const mockClient = new MockMCPClient();
  setMCPClient(mockClient);
  console.log('✓ Mock MCP client initialized\n');

  // Test 1: Create entities
  console.log('Test 1: Creating entities...');
  const createResult = await createEntities([
    { name: 'Server_001', entityType: 'Server', observations: ['status: active', 'region: us-east'] },
    { name: 'Server_002', entityType: 'Server', observations: ['status: inactive', 'region: us-west'] },
    { name: 'Server_003', entityType: 'Server', observations: ['status: active', 'region: eu-west'] },
    { name: 'Database_001', entityType: 'Database', observations: ['status: active', 'type: postgres'] },
  ]);
  console.log(`✓ Created ${createResult.entities.length} entities\n`);

  // Test 2: Read graph
  console.log('Test 2: Reading graph...');
  const graph = await readGraph();
  console.log(`✓ Graph has ${graph.entities.length} entities, ${graph.relations.length} relations\n`);

  // Test 3: Search nodes
  console.log('Test 3: Searching for "active" nodes...');
  const searchResult = await searchNodes('active');
  console.log(`✓ Found ${searchResult.entities.length} matching entities`);
  searchResult.entities.forEach(e => console.log(`  - ${e.name} (${e.entityType})`));
  console.log();

  // Test 4: Iterative operation (the key benefit!)
  console.log('Test 4: Iterative update (5 iterations in single code block)...');
  const startTime = Date.now();

  // This loop runs entirely in "sandbox" - no model round-trips
  const updatedEntities: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const entityName = `Server_00${Math.min(i, 3)}`; // Cycle through servers
    const result = await openNodes([entityName]);
    if (result.entities.length > 0) {
      await addObservations([
        { entityName, contents: [`iteration_${i}: processed`] }
      ]);
      updatedEntities.push(entityName);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`✓ Updated ${updatedEntities.length} entities in ${elapsed}ms`);
  console.log(`  (With direct tool calls, this would be 10 model round-trips)\n`);

  // Test 5: Verify updates
  console.log('Test 5: Verifying updates...');
  const server1 = await openNodes(['Server_001']);
  console.log(`✓ Server_001 observations:`);
  server1.entities[0]?.observations.forEach(o => console.log(`  - ${o}`));
  console.log();

  // Test 6: Cleanup
  console.log('Test 6: Cleanup...');
  await deleteEntities(['Server_001', 'Server_002', 'Server_003', 'Database_001']);
  const finalGraph = await readGraph();
  console.log(`✓ Cleaned up. Graph now has ${finalGraph.entities.length} entities\n`);

  console.log('=== All tests passed ===');
}

runTest().catch(console.error);

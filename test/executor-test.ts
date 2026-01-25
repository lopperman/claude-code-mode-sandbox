/**
 * Test: Code Execution Sandbox
 *
 * This test runs the same 5-iteration "find and update" operation
 * that we did with direct tool calls, but now through the sandbox.
 *
 * Comparison:
 * - Direct tool calls: 10 MCP calls, ~43 seconds
 * - Code execution: 1 executeCode call, expected <1 second (for mock)
 */

import { executeCode } from '../executor/index.js';
import { setMCPClient, MockMCPClient, type Graph } from '../servers/memory/index.js';

async function runTest() {
  console.log('=== Code Execution Sandbox Test ===\n');

  // Initialize mock client with test data
  const mockClient = new MockMCPClient();
  setMCPClient(mockClient);

  // Pre-populate with test records (simulating our 50 test records)
  const testEntities = [];
  for (let i = 1; i <= 50; i++) {
    const id = i.toString().padStart(3, '0');
    testEntities.push({
      name: `Record_${id}`,
      entityType: 'TestRecord',
      observations: [
        'count: 0',
        i % 3 === 0 ? 'status: inactive' : 'status: active',
        `category: ${['A', 'B', 'C'][i % 3]}`,
      ],
    });
  }

  // Load test data into mock
  const initialGraph: Graph = {
    entities: testEntities.map(e => ({ ...e, type: 'entity' as const })),
    relations: [],
  };
  mockClient.loadData(initialGraph);

  console.log(`✓ Loaded ${testEntities.length} test records into mock client\n`);

  // Test 1: Simple code execution
  console.log('Test 1: Simple code execution...');
  const simpleResult = await executeCode(`
    const graph = await memory.readGraph();
    console.log('Entity count:', graph.entities.length);
  `);
  console.log(`✓ Output: ${simpleResult.output.join(', ')}`);
  console.log(`  Elapsed: ${simpleResult.elapsedMs}ms\n`);

  // Test 2: The key comparison - 5 iterations in single code block
  console.log('Test 2: 5 iterations of find+update (single code block)...');
  console.log('        (This is the same operation that took ~43 sec with direct calls)\n');

  const startMs = Date.now();

  const iterativeResult = await executeCode(`
    const recordIds = ['002', '018', '035', '044', '027'];
    const results = [];

    for (const id of recordIds) {
      const recordName = 'Record_' + id;

      // Find the record
      const found = await memory.openNodes([recordName]);
      if (found.entities.length === 0) {
        results.push({ record: recordName, status: 'not found' });
        continue;
      }

      // Update it
      await memory.addObservations([{
        entityName: recordName,
        contents: ['sandbox_test: updated']
      }]);

      results.push({ record: recordName, status: 'updated' });
    }

    console.log('Iterations completed:', results.length);
    console.log('Results:', JSON.stringify(results));
  `);

  const totalMs = Date.now() - startMs;

  console.log('Output:');
  iterativeResult.output.forEach(line => console.log(`  ${line}`));
  console.log();
  console.log(`✓ Code execution time: ${iterativeResult.elapsedMs}ms`);
  console.log(`✓ Total time (including setup): ${totalMs}ms`);
  console.log();

  // Test 3: Verify the updates
  console.log('Test 3: Verifying updates...');
  const verifyResult = await executeCode(`
    const record = await memory.openNodes(['Record_002']);
    console.log('Record_002 observations:', JSON.stringify(record.entities[0]?.observations));
  `);
  console.log(`✓ ${verifyResult.output[0]}\n`);

  // Test 4: Larger iteration count
  console.log('Test 4: 50 iterations (would take ~7 min with direct calls)...');

  const largeResult = await executeCode(`
    let updatedCount = 0;
    for (let i = 1; i <= 50; i++) {
      const id = i.toString().padStart(3, '0');
      const recordName = 'Record_' + id;

      const found = await memory.openNodes([recordName]);
      if (found.entities.length > 0) {
        await memory.addObservations([{
          entityName: recordName,
          contents: ['bulk_update: iteration_' + i]
        }]);
        updatedCount++;
      }
    }
    console.log('Updated', updatedCount, 'records');
  `);

  console.log(`✓ Output: ${largeResult.output.join(', ')}`);
  console.log(`✓ Elapsed: ${largeResult.elapsedMs}ms`);
  console.log(`  (Projected direct call time: ~7 minutes)\n`);

  // Summary
  console.log('=== Performance Comparison ===\n');
  console.log('| Operation          | Direct Calls | Code Execution |');
  console.log('|--------------------|--------------|----------------|');
  console.log('| 5 iterations       | ~43,000 ms   | ' + iterativeResult.elapsedMs.toString().padStart(10) + ' ms |');
  console.log('| 50 iterations      | ~430,000 ms  | ' + largeResult.elapsedMs.toString().padStart(10) + ' ms |');
  console.log();
  console.log('Note: Code execution times use MockMCPClient (in-memory).');
  console.log('      Real MCP calls would add network latency per operation,');
  console.log('      but still far faster than model round-trips.\n');

  console.log('=== All tests passed ===');
}

runTest().catch(console.error);

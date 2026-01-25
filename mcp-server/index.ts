#!/usr/bin/env node
/**
 * Code Execution MCP Server
 *
 * This MCP server exposes a single tool: execute_code
 *
 * Instead of exposing 9+ memory tools (create_entities, search_nodes, etc.),
 * this server exposes ONE tool that can run JavaScript code with access to
 * all those operations.
 *
 * Benefits:
 * - Fewer tool definitions in context (1 vs 9+)
 * - Batch operations run locally, not as model round-trips
 * - Complex logic (loops, conditionals) executes in code
 *
 * Usage:
 *   Add to .mcp.json:
 *   {
 *     "mcpServers": {
 *       "code_executor": {
 *         "type": "stdio",
 *         "command": "node",
 *         "args": ["dist/mcp-server/index.js"]
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { executeCode } from '../executor/index.js';
import { setMCPClient, MockMCPClient } from '../servers/memory/index.js';

// Initialize with mock client for now
// In production, this would connect to real MCP servers
const mockClient = new MockMCPClient();
setMCPClient(mockClient);

// Pre-load test data (same 50 records from our experiment)
const testEntities = [];
for (let i = 1; i <= 50; i++) {
  const id = i.toString().padStart(3, '0');
  testEntities.push({
    type: 'entity' as const,
    name: `Record_${id}`,
    entityType: 'TestRecord',
    observations: [
      'count: 0',
      i % 3 === 0 ? 'status: inactive' : 'status: active',
      `category: ${['A', 'B', 'C'][i % 3]}`,
    ],
  });
}
mockClient.loadData({ entities: testEntities, relations: [] });

// Create MCP server
const server = new McpServer({
  name: 'code-executor',
  version: '1.0.0',
});

// Define the execute_code tool
server.tool(
  'execute_code',
  'Execute JavaScript code with access to memory operations. Use this for batch operations on records.',
  {
    code: z.string().describe(
      'JavaScript code to execute. Has access to `memory` object with methods: ' +
      'readGraph(), createEntities([...]), searchNodes(query), openNodes([names]), ' +
      'addObservations([...]), deleteEntities([names]), etc. ' +
      'Use console.log() to output results.'
    ),
    timeout_ms: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  },
  async ({ code, timeout_ms }) => {
    const startTime = Date.now();

    try {
      const result = await executeCode(code, {
        timeoutMs: timeout_ms ?? 30000,
      });

      const totalTime = Date.now() - startTime;

      if (result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                '✓ Code executed successfully',
                `Execution time: ${result.elapsedMs}ms`,
                `Total time: ${totalTime}ms`,
                '',
                'Output:',
                ...result.output.map(line => `  ${line}`),
              ].join('\n'),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                '✗ Code execution failed',
                `Error: ${result.error}`,
                `Execution time: ${result.elapsedMs}ms`,
                '',
                'Partial output:',
                ...result.output.map(line => `  ${line}`),
              ].join('\n'),
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Also expose a simple tool to check the current state (for debugging)
server.tool(
  'get_record_count',
  'Get the current number of records in memory (for debugging)',
  {},
  async () => {
    const result = await executeCode('const g = await memory.readGraph(); console.log(g.entities.length);');
    const count = result.output[0] || '0';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Records in memory: ${count}`,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Code Executor MCP Server running on stdio');
}

main().catch(console.error);

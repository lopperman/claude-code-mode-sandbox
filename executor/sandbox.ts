/**
 * Code Execution Sandbox
 *
 * This module provides a sandboxed environment for executing agent-generated code.
 * The code has access to memory tool wrappers but limited system access.
 *
 * Security notes:
 * - Uses Node.js vm module (basic isolation, not production-grade)
 * - For production, consider: isolated-vm, Docker, or Deno
 * - Timeout protection prevents infinite loops
 * - Console output is captured and returned
 */

import vm from 'node:vm';
import * as memory from '../servers/memory/index.js';

export interface ExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  elapsedMs: number;
}

export interface ExecutionOptions {
  timeoutMs?: number;
}

/**
 * Execute code in a sandboxed environment with access to memory tools
 *
 * @param code - The JavaScript/TypeScript code to execute (must be valid JS)
 * @param options - Execution options
 * @returns Execution result with output and timing
 *
 * @example
 * const result = await executeCode(`
 *   const graph = await memory.readGraph();
 *   console.log('Entities:', graph.entities.length);
 * `);
 */
export async function executeCode(
  code: string,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const { timeoutMs = 30000 } = options;
  const output: string[] = [];
  const startTime = Date.now();

  // Create a custom console that captures output
  const sandboxConsole = {
    log: (...args: unknown[]) => {
      output.push(args.map(a => formatValue(a)).join(' '));
    },
    error: (...args: unknown[]) => {
      output.push('[ERROR] ' + args.map(a => formatValue(a)).join(' '));
    },
    warn: (...args: unknown[]) => {
      output.push('[WARN] ' + args.map(a => formatValue(a)).join(' '));
    },
  };

  // Create sandbox context with memory tools and utilities
  const sandbox = {
    // Memory tool wrappers
    memory: {
      readGraph: memory.readGraph,
      createEntities: memory.createEntities,
      createRelations: memory.createRelations,
      addObservations: memory.addObservations,
      deleteEntities: memory.deleteEntities,
      deleteObservations: memory.deleteObservations,
      deleteRelations: memory.deleteRelations,
      searchNodes: memory.searchNodes,
      openNodes: memory.openNodes,
    },

    // Console for output
    console: sandboxConsole,

    // Utilities
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    Math: Math,
    RegExp: RegExp,
    Error: Error,
    Map: Map,
    Set: Set,
  };

  // Create VM context
  const context = vm.createContext(sandbox);

  // Wrap code in async IIFE to support top-level await
  const wrappedCode = `
    (async () => {
      ${code}
    })();
  `;

  try {
    // Compile and run the code
    const script = new vm.Script(wrappedCode, {
      filename: 'agent-code.js',
    });

    // Execute with timeout
    const resultPromise = script.runInContext(context, {
      timeout: timeoutMs,
    });

    // Wait for async completion
    await resultPromise;

    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      output,
      elapsedMs,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      output,
      error: errorMessage,
      elapsedMs,
    };
  }
}

/**
 * Format a value for console output
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

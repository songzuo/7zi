#!/usr/bin/env node
/**
 * MCP Server CLI Entry Point
 * 
 * Run the MCP server using stdio transport.
 * This is the standard way to run MCP servers as subprocesses.
 * 
 * Usage:
 *   node lib/mcp/cli.ts
 *   npx tsx lib/mcp/cli.ts
 */

import { getMcpServer } from './server';

async function main() {
  console.error('[7zi MCP Server] Starting...');
  
  try {
    const server = getMcpServer({
      name: '7zi-mcp-server',
      version: '1.0.0',
      debug: process.env.MCP_DEBUG === 'true',
    });

    // Log available tools to stderr (stdout is for MCP messages)
    console.error(`[7zi MCP Server] Registered ${server.getTools().length} tools:`);
    server.getTools().forEach(tool => {
      console.error(`  - ${tool.name}: ${tool.description.substring(0, 60)}...`);
    });

    // Start stdio transport
    await server.startStdio();
    
    console.error('[7zi MCP Server] Server started, waiting for connections...');
  } catch (_error) {
    console.error('[7zi MCP Server] Error starting server:', error);
    process.exit(1);
  }
}

main();
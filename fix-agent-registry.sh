#!/bin/bash

# Fix TypeScript errors in agent-registry.test.ts
# This script adds missing lastHeartbeat fields to AgentRegistration objects

FILE="src/lib/a2a/__tests__/agent-registry.test.ts"

# Create backup
cp "$FILE" "$FILE.bak"

# Add helper function after describe block
sed -i '/afterEach/,/describe/{
  /resetAgentRegistry();/a\
\
  // Helper function to create test agents\
  const createTestAgent = (overrides: Partial<AgentRegistration> = {}): AgentRegistration => ({\
    id: overrides.id || `agent-${Date.now()}`,\
    name: overrides.name || '\''Test Agent'\'',\
    url: overrides.url || '\''http://localhost:3000'\'',\
    capabilities: overrides.capabilities || ['\''chat'\''],\
    skills: overrides.skills || ['\''conversation'\''],\
    status: overrides.status || '\''online'\'',\
    lastHeartbeat: overrides.lastHeartbeat || new Date().toISOString(),\
    ...overrides,\
  });
}' "$FILE"

echo "Fixed: Added helper function to $FILE"

#!/usr/bin/env python3
"""Fix agent-registry.test.ts by adding missing lastHeartbeat fields"""

import re

file_path = 'src/lib/a2a/__tests__/agent-registry.test.ts'

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Add helper function after the afterEach block
helper_function = '''
  // Helper function to create test agents
  const createTestAgent = (overrides: Partial<AgentRegistration> = {}): AgentRegistration => ({
    id: overrides.id || `agent-${Date.now()}`,
    name: overrides.name || 'Test Agent',
    url: overrides.url || 'http://localhost:3000',
    capabilities: overrides.capabilities || ['chat'],
    skills: overrides.skills || ['conversation'],
    status: overrides.status || 'online',
    lastHeartbeat: overrides.lastHeartbeat || new Date().toISOString(),
    ...overrides,
  });
'''

# Find the right place to insert (after resetAgentRegistry section)
insert_pattern = r"(afterEach\(\) \{[\s\S]*?resetAgentRegistry\(\);[\s]*?\});"
replacement = r"\1" + helper_function

content = re.sub(insert_pattern, replacement, content, count=1)

# Now replace all AgentRegistration object literals with createTestAgent calls
# Pattern: const agent: AgentRegistration = {
# Replace with: const agent = createTestAgent({

pattern1 = r"(const\s+\w+):\s*AgentRegistration\s*=\s*\{"
replacement1 = r"\1 = createTestAgent({"

content = re.sub(pattern1, replacement1, content)

# Pattern: const agent1: AgentRegistration = {
# etc.
content = re.sub(pattern1, replacement1, content)

# Write back
with open(file_path, 'w') as f:
    f.write(content)

print(f"Fixed: Added helper function and updated agent creation in {file_path}")

# Agent Scheduler CLI - User Guide

Command-line interface for managing AI agent tasks and scheduling in the AgentScheduler system.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Reference](#command-reference)
  - [Global Options](#global-options)
  - [Task Management](#task-management)
  - [Agent Management](#agent-management)
  - [Schedule Management](#schedule-management)
  - [System Commands](#system-commands)
- [Examples](#examples)
- [Script Integration](#script-integration)
- [JSON Output](#json-output)

---

## Installation

The CLI is part of the AgentScheduler project. Make sure you have the project dependencies installed:

```bash
npm install
```

### Running the CLI

```bash
# Using ts-node (development)
npx ts-node src/tools/agent-cli.ts [command]

# Or compile and run
npm run build
node dist/tools/agent-cli.js [command]
```

### Create an alias (optional)

For convenience, add an alias to your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias agent-cli='npx ts-node /path/to/workspace/src/tools/agent-cli.ts'

# Then use directly
agent-cli task list
```

---

## Quick Start

```bash
# 1. Add a task
agent-cli task add "研究新技术架构" \
  --type research \
  --priority high \
  --duration 60 \
  --description "调研最新的AI架构方案"

# 2. List pending tasks
agent-cli task list --pending

# 3. Trigger scheduling
agent-cli schedule trigger

# 4. Check agent status
agent-cli agent list

# 5. View scheduling statistics
agent-cli schedule stats
```

---

## Command Reference

### Global Options

```
--json          Output in JSON format (useful for scripting)
-h, --help      Show help information
-V, --version   Show version number
```

---

### Task Management

#### `task add <title>` - Add a new task

Add a new task to the scheduling queue.

**Arguments:**

- `<title>` - Task title (required)

**Options:**

- `--type <type>` - Task type: `architecture`, `research`, `implementation`, `testing`, `devops`, `design`, `marketing`, `sales`, `finance`, `media`, `general` (default: `general`)
- `--priority <priority>` - Task priority: `low`, `medium`, `high`, `urgent` (default: `medium`)
- `--duration <minutes>` - Estimated duration in minutes (default: `30`)
- `--deadline <timestamp>` - Deadline (Unix timestamp or ISO string)
- `--description <text>` - Task description
- `--dependencies <ids>` - Comma-separated task IDs this task depends on
- `--capabilities <list>` - Comma-separated required capabilities
- `--created-by <user>` - User ID creating the task

**Example:**

```bash
agent-cli task add "实现用户认证功能" \
  --type implementation \
  --priority high \
  --duration 120 \
  --description "使用JWT实现用户登录注册" \
  --capabilities "typescript,jwt,security"
```

---

#### `task list` - List tasks

List tasks with optional filtering.

**Options:**

- `--status <status>` - Filter by status: `pending`, `assigned`, `in_progress`, `completed`, `failed`, `cancelled`
- `--type <type>` - Filter by task type
- `--agent <agentId>` - Filter by assigned agent
- `--pending` - Show only pending tasks
- `--overdue` - Show only overdue tasks
- `--urgent` - Show only urgent tasks (high/urgent priority or deadline < 1 hour)
- `--limit <number>` - Limit number of results (default: `50`)

**Examples:**

```bash
# List all pending tasks
agent-cli task list --pending

# List completed tasks
agent-cli task list --status completed

# List tasks assigned to architect
agent-cli task list --agent architect

# List urgent tasks
agent-cli task list --urgent

# List overdue tasks
agent-cli task list --overdue
```

---

#### `task show <taskId>` - Show task details

Display detailed information about a specific task.

**Arguments:**

- `<taskId>` - Task ID

**Example:**

```bash
agent-cli task show 550e8400-e29b-41d4-a716-446655440000
```

---

#### `task start <taskId>` - Start a task

Mark a task as started (status: `in_progress`).

**Arguments:**

- `<taskId>` - Task ID

**Example:**

```bash
agent-cli task start 550e8400-e29b-41d4-a716-446655440000
```

---

#### `task complete <taskId>` - Complete a task

Mark a task as completed.

**Arguments:**

- `<taskId>` - Task ID

**Example:**

```bash
agent-cli task complete 550e8400-e29b-41d4-a716-446655440000
```

---

#### `task fail <taskId> <error>` - Mark task as failed

Mark a task as failed with an error message.

**Arguments:**

- `<taskId>` - Task ID
- `<error>` - Error message describing the failure

**Example:**

```bash
agent-cli task fail 550e8400-e29b-41d4-a716-446655440000 "API rate limit exceeded"
```

---

#### `task reassign <taskId>` - Reassign failed task

Reassign a failed task to another agent.

**Arguments:**

- `<taskId>` - Task ID

**Example:**

```bash
agent-cli task reassign 550e8400-e29b-41d4-a716-446655440000
```

---

### Agent Management

#### `agent list` - List all agents

Display information about all registered agents.

**Options:**

- `--available` - Show only available agents
- `--type <taskType>` - Show agents capable of specific task type

**Examples:**

```bash
# List all agents
agent-cli agent list

# List only available agents
agent-cli agent list --available

# List agents capable of architecture tasks
agent-cli agent list --type architecture
```

---

#### `agent show <agentId>` - Show agent details

Display detailed information about a specific agent.

**Arguments:**

- `<agentId>` - Agent ID

**Available Agents:**

- `agent-expert` - 智能体世界专家 (minimax)
- `consultant` - 咨询师 (minimax)
- `architect` - 架构师 (self-claude)
- `executor` - Executor (volcengine)
- `sysadmin` - 系统管理员 (bailian)
- `tester` - 测试员 (minimax)
- `designer` - 设计师 (self-claude)
- `promoter` - 推广专员 (volcengine)
- `sales` - 销售客服 (bailian)
- `finance` - 财务 (minimax)
- `media` - 媒体 (self-claude)

**Example:**

```bash
agent-cli agent show architect
```

---

#### `agent available <agentId> <available>` - Set agent availability

Set whether an agent is available for new tasks.

**Arguments:**

- `<agentId>` - Agent ID
- `<available>` - Availability: `true` or `false`

**Example:**

```bash
# Set agent as unavailable
agent-cli agent available sysadmin false

# Set agent as available
agent-cli agent available sysadmin true
```

---

#### `agent tasks <agentId>` - Get agent tasks

Show tasks currently assigned to an agent.

**Arguments:**

- `<agentId>` - Agent ID

**Example:**

```bash
agent-cli agent tasks executor
```

---

### Schedule Management

#### `schedule trigger` - Trigger scheduling

Manually trigger a scheduling cycle.

**Options:**

- `--batch-size <number>` - Maximum tasks to schedule in this batch

**Example:**

```bash
# Trigger with default batch size
agent-cli schedule trigger

# Trigger with custom batch size
agent-cli schedule trigger --batch-size 5
```

---

#### `schedule stats` - Show scheduling statistics

Display comprehensive scheduling statistics and metrics.

**Output includes:**

- Task statistics (total, pending, assigned, in progress, completed, failed)
- Scheduling metrics (total decisions, average confidence)
- Load balancing statistics
- Scaling suggestions

**Example:**

```bash
agent-cli schedule stats
```

---

#### `schedule history` - Show recent decisions

Display recent scheduling decisions.

**Options:**

- `--limit <number>` - Number of decisions to show (default: `10`)
- `--agent <agentId>` - Filter by agent ID

**Examples:**

```bash
# Show last 10 decisions
agent-cli schedule history

# Show last 20 decisions
agent-cli schedule history --limit 20

# Show decisions for specific agent
agent-cli schedule history --agent architect
```

---

### System Commands

#### `dashboard` - Open dashboard URL

Display the web dashboard URL.

**Options:**

- `--url <url>` - Custom dashboard URL (default: `http://localhost:3000/dashboard`)

**Example:**

```bash
agent-cli dashboard
```

---

#### `clear` - Clear all tasks

Clear all tasks from the queue. **Use with caution!**

**Options:**

- `--confirm` - Confirm clearing without prompt

**Example:**

```bash
agent-cli clear --confirm
```

---

#### `reset` - Reset scheduler state

Reset the entire scheduler state (clears tasks, history, and resets agents). **Use with caution!**

**Options:**

- `--confirm` - Confirm reset without prompt

**Example:**

```bash
agent-cli reset --confirm
```

---

#### `export` - Export scheduler state

Export scheduler state to JSON.

**Options:**

- `--output <file>` - Output file path (default: stdout)

**Examples:**

```bash
# Export to stdout
agent-cli export

# Export to file
agent-cli export --output scheduler-state.json
```

---

#### `config` - Show scheduler configuration

Display current scheduler configuration and statistics.

**Example:**

```bash
agent-cli config
```

---

## Examples

### Complete Workflow Example

```bash
# 1. Create a research task
agent-cli task add "调研AI架构方案" \
  --type research \
  --priority high \
  --duration 60 \
  --description "研究最新的AI智能体架构" \
  --created-by "user123"

# 2. Create an implementation task that depends on the research
agent-cli task add "实现智能体调度器" \
  --type implementation \
  --priority high \
  --duration 180 \
  --dependencies "$(agent-cli --json task list --pending | jq -r '.tasks[0].id')" \
  --description "基于调研结果实现调度器" \
  --capabilities "typescript,architecture"

# 3. View pending tasks
agent-cli task list --pending

# 4. Check agent availability
agent-cli agent list --available --type research

# 5. Trigger scheduling
agent-cli schedule trigger

# 6. Monitor task progress
agent-cli task list --status in_progress

# 7. Complete tasks when done
agent-cli task complete <taskId>
```

### Batch Task Creation

```bash
#!/bin/bash
# create-tasks.sh

# Create multiple tasks at once
agent-cli task add "设计数据库架构" --type architecture --priority high --duration 60
agent-cli task add "实现API接口" --type implementation --priority medium --duration 120
agent-cli task add "编写单元测试" --type testing --priority medium --duration 90
agent-cli task add "部署到生产环境" --type devops --priority high --duration 45

echo "Tasks created successfully"
```

### Monitoring Dashboard

```bash
#!/bin/bash
# monitor.sh

while true; do
  clear
  echo "=== Agent Scheduler Monitor ==="
  echo ""
  echo "Time: $(date)"
  echo ""

  echo "--- Task Statistics ---"
  agent-cli schedule stats | grep -A 20 "taskStatistics"

  echo ""
  echo "--- Agent Status ---"
  agent-cli agent list

  echo ""
  echo "--- Recent Decisions ---"
  agent-cli schedule history --limit 5

  sleep 30
done
```

---

## Script Integration

### Using JSON Output

Use the `--json` flag for machine-readable output:

```bash
# Get task list as JSON
agent-cli --json task list --pending

# Get agent status as JSON
agent-cli --json agent list

# Get scheduling statistics as JSON
agent-cli --json schedule stats
```

### Parse with jq

```bash
# Count pending tasks
agent-cli --json task list --pending | jq '.total'

# Get list of available agent IDs
agent-cli --json agent list --available | jq -r '.agents[].id'

# Get tasks assigned to specific agent
agent-cli --json task list --agent architect | jq '.tasks[]'

# Get task by title
agent-cli --json task list | jq '.tasks[] | select(.title | contains("架构"))'

# Check if any tasks are overdue
agent-cli --json task list --overdue | jq '.total > 0'
```

### Bash Script Example

```bash
#!/bin/bash
# auto-schedule.sh

# Check for pending tasks
PENDING_COUNT=$(agent-cli --json task list --pending | jq '.total')

if [ "$PENDING_COUNT" -gt 0 ]; then
  echo "Found $PENDING_COUNT pending tasks, triggering schedule..."

  # Trigger scheduling
  RESULT=$(agent-cli --json schedule trigger)

  # Check result
  SCHEDULED=$(echo "$RESULT" | jq '.stats.totalScheduled')
  FAILED=$(echo "$RESULT" | jq '.stats.totalFailed')

  echo "Scheduled: $SCHEDULED, Failed: $FAILED"

  # If any failed, log them
  if [ "$FAILED" -gt 0 ]; then
    echo "Failed tasks:"
    echo "$RESULT" | jq -r '.failed[] | "  - \(.taskId): \(.reason)"'
  fi
else
  echo "No pending tasks"
fi
```

### Node.js Integration

```javascript
const { execSync } = require('child_process')

function runCliCommand(args) {
  const output = execSync(`npx ts-node src/tools/agent-cli.ts --json ${args}`, { encoding: 'utf8' })
  return JSON.parse(output)
}

// Example usage
async function main() {
  // Add a task
  const tasks = runCliCommand('task add "Test task" --type research')
  console.log('Created task:', tasks.task.id)

  // List agents
  const agents = runCliCommand('agent list')
  console.log(
    'Available agents:',
    agents.agents.filter(a => a.availability)
  )

  // Trigger scheduling
  const result = runCliCommand('schedule trigger')
  console.log('Scheduled tasks:', result.stats.totalScheduled)
}

main()
```

### Python Integration

```python
import subprocess
import json

def run_cli_command(args):
    output = subprocess.check_output(
        f'npx ts-node src/tools/agent-cli.ts --json {args}',
        shell=True,
        text=True
    )
    return json.loads(output)

# Example usage
if __name__ == '__main__':
    # List tasks
    tasks = run_cli_command('task list --pending')
    print(f"Pending tasks: {tasks['total']}")

    # Get agent status
    agents = run_cli_command('agent list --available')
    for agent in agents['agents']:
        print(f"{agent['name']}: {agent['currentLoad']}% load")

    # Trigger schedule
    result = run_cli_command('schedule trigger')
    print(f"Scheduled: {result['stats']['totalScheduled']}")
```

---

## JSON Output

When using `--json`, all commands output structured JSON for easy parsing:

### Task Output Format

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "research",
  "title": "调研新技术",
  "priority": "high",
  "status": "pending",
  "assignedAgent": null,
  "estimatedDuration": 60,
  "createdAt": 1640995200000,
  "deadline": null,
  "description": "研究最新的AI技术",
  "dependencies": []
}
```

### Agent Output Format

```json
{
  "agentId": "architect",
  "name": "架构师",
  "provider": "self-claude",
  "role": "架构设计",
  "availability": true,
  "currentLoad": 45,
  "capabilities": {
    "techStack": ["typescript", "react", "architecture-patterns"],
    "taskTypes": ["architecture", "implementation"],
    "concurrency": 2,
    "avgResponseTime": 12,
    "successRate": 0.96
  }
}
```

### Schedule Result Format

```json
{
  "success": true,
  "scheduled": [
    {
      "taskId": "550e8400-e29b-41d4-a716-446655440000",
      "assignedAgent": "architect",
      "confidence": 0.92,
      "reasoning": "Agent has strong architecture capabilities",
      "alternativeAgents": ["agent-expert"],
      "estimatedCompletion": 1640998800000,
      "scores": {
        "capability": 0.95,
        "load": 0.85,
        "performance": 0.9,
        "response": 0.88,
        "total": 0.92
      }
    }
  ],
  "failed": [],
  "stats": {
    "totalPending": 5,
    "totalScheduled": 1,
    "totalFailed": 0
  }
}
```

---

## Tips and Best Practices

1. **Use task dependencies** for complex workflows
2. **Set appropriate priorities** to ensure critical tasks are scheduled first
3. **Monitor agent load** before assigning tasks manually
4. **Use --json output** for automation and scripts
5. **Regularly check overdue tasks** to avoid missed deadlines
6. **Review schedule history** to understand scheduling decisions
7. **Set deadlines** for time-sensitive tasks
8. **Use agent availability** to manage resource constraints

---

## Troubleshooting

### Task not being scheduled

```bash
# Check if agent is available
agent-cli agent show <agentId>

# Check task dependencies
agent-cli show <taskId>

# Check if agents have matching capabilities
agent-cli agent list --type <taskType>
```

### Agent overload

```bash
# Check agent load
agent-cli agent list

# Set agent as temporarily unavailable
agent-cli agent available <agentId> false

# Check scaling suggestions
agent-cli schedule stats
```

### Export/Import state

```bash
# Export state for backup
agent-cli export --output backup.json

# (Note: import functionality would be added to scheduler)
```

---

## Contributing

To add new CLI commands:

1. Add command to `src/tools/agent-cli.ts`
2. Update this documentation
3. Test with `--json` flag
4. Add examples

---

## License

Part of the AgentScheduler project. See project LICENSE for details.

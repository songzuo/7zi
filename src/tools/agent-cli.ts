#!/usr/bin/env node
/**
 * Agent Scheduler CLI Tool
 * Command-line interface for managing AI agent tasks and scheduling
 */

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentScheduler, 
  SchedulerConfig,
  SchedulingResult
} from '../lib/agents/scheduler/core/scheduler';
import { 
  Task, 
  TaskPriority, 
  TaskType,
  createTask 
} from '../lib/agents/scheduler/models/task-model';
import { 
  AgentCapability,
  TaskType as AgentTaskType 
} from '../lib/agents/scheduler/models/agent-capability';

// Global scheduler instance (in real implementation, this would connect to a running service)
let scheduler: AgentScheduler | null = null;
let jsonOutput = false;

/**
 * Initialize scheduler instance
 */
function initializeScheduler(config?: Partial<SchedulerConfig>): AgentScheduler {
  if (!scheduler) {
    scheduler = new AgentScheduler(config);
    scheduler.initialize();
  }
  return scheduler;
}

/**
 * Format output based on --json flag
 */
function output(data: any): void {
  if (jsonOutput) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(formatOutput(data));
  }
}

/**
 * Format data for human-readable output
 */
function formatOutput(data: any): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map(item => formatOutput(item)).join('\n\n');
  }
  
  // Format object as pretty text
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      lines.push(formatOutput(value).split('\n').map(l => `  ${l}`).join('\n'));
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format task for display
 */
function formatTask(task: Task): any {
  const statusEmoji: Record<Task['status'], string> = {
    pending: '⏳',
    assigned: '📋',
    in_progress: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫'
  };

  const priorityEmoji: Record<TaskPriority, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  };

  return jsonOutput ? task : {
    id: task.id,
    title: task.title,
    type: task.type,
    priority: `${priorityEmoji[task.priority]} ${task.priority}`,
    status: `${statusEmoji[task.status]} ${task.status}`,
    assignedAgent: task.assignedAgent || '—',
    estimatedDuration: `${task.estimatedDuration} min`,
    createdAt: new Date(task.createdAt).toLocaleString('zh-CN'),
    deadline: task.deadline ? new Date(task.deadline).toLocaleString('zh-CN') : '—',
    description: task.description || '—',
    dependencies: task.dependencies.length > 0 ? task.dependencies : '—'
  };
}

/**
 * Format agent for display
 */
function formatAgent(agent: AgentCapability): any {
  const availability = agent.availability ? '🟢 可用' : '🔴 不可用';
  const loadPercent = agent.currentLoad.toFixed(0);
  const loadBar = '█'.repeat(Math.floor(agent.currentLoad / 10)) + 
                  '░'.repeat(10 - Math.floor(agent.currentLoad / 10));

  return jsonOutput ? agent : {
    id: agent.agentId,
    name: agent.name,
    provider: agent.provider,
    role: agent.role,
    availability: availability,
    load: `${loadBar} ${loadPercent}%`,
    techStack: agent.capabilities.techStack.join(', '),
    taskTypes: agent.capabilities.taskTypes.join(', '),
    concurrency: agent.capabilities.concurrency,
    avgResponseTime: `${agent.capabilities.avgResponseTime}s`,
    successRate: `${(agent.capabilities.successRate * 100).toFixed(1)}%`,
    metrics: agent.metrics ? {
      completed: agent.metrics.totalTasksCompleted,
      avgTime: `${agent.metrics.averageCompletionTime}min`,
      errorRate: `${(agent.metrics.errorRate * 100).toFixed(1)}%`
    } : '—'
  };
}

/**
 * Format scheduling result
 */
function formatSchedulingResult(result: SchedulingResult): any {
  if (jsonOutput) return result;

  const sections: string[] = [];
  
  sections.push('📊 Scheduling Result');
  sections.push(`Success: ${result.success ? '✅' : '❌'}`);
  sections.push(``);
  sections.push('Statistics:');
  sections.push(`  Total Pending: ${result.stats.totalPending}`);
  sections.push(`  Scheduled: ${result.stats.totalScheduled}`);
  sections.push(`  Failed: ${result.stats.totalFailed}`);
  
  if (result.scheduled.length > 0) {
    sections.push('');
    sections.push('✅ Scheduled Tasks:');
    result.scheduled.forEach((decision, i) => {
      sections.push(`  ${i + 1}. Task ${decision.taskId} → ${decision.assignedAgent}`);
      sections.push(`     Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      sections.push(`     Reasoning: ${decision.reasoning}`);
    });
  }
  
  if (result.failed.length > 0) {
    sections.push('');
    sections.push('❌ Failed Tasks:');
    result.failed.forEach((fail, i) => {
      sections.push(`  ${i + 1}. Task ${fail.taskId}`);
      sections.push(`     Reason: ${fail.reason}`);
    });
  }
  
  return sections.join('\n');
}

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('agent-cli')
  .description('AI Agent Scheduler CLI - Manage tasks and agents from command line')
  .version('1.0.0')
  .option('--json', 'Output in JSON format')
  .hook('preAction', (thisCommand: Command) => {
    jsonOutput = thisCommand.opts().json;
  });

// ============================================================================
// Task Commands
// ============================================================================

const taskCmd = program.command('task').description('Task management');

// Add task
taskCmd
  .command('add')
  .description('Add a new task to the queue')
  .argument('<title>', 'Task title')
  .option('--type <type>', 'Task type', 'general')
  .option('--priority <priority>', 'Task priority (low|medium|high|urgent)', 'medium')
  .option('--duration <minutes>', 'Estimated duration in minutes', '30')
  .option('--deadline <timestamp>', 'Deadline timestamp (Unix timestamp or ISO string)')
  .option('--description <text>', 'Task description')
  .option('--dependencies <ids>', 'Comma-separated task IDs this task depends on')
  .option('--capabilities <list>', 'Comma-separated required capabilities')
  .option('--created-by <user>', 'User ID creating the task')
  .action((title: string, options: Record<string, unknown>) => {
    const sched = initializeScheduler();

    // Parse options
    const taskType = options.type as TaskType;
    const priority = options.priority as TaskPriority;
    const duration = parseInt(String(options.duration), 10);
    
    let deadline: number | undefined;
    if (options.deadline) {
      const parsed = parseInt(String(options.deadline), 10);
      deadline = isNaN(parsed) ? new Date(String(options.deadline)).getTime() : parsed;
    }

    const dependencies = options.dependencies 
      ? String(options.dependencies).split(',').map((id: string) => id.trim())
      : [];

    const requiredCapabilities = options.capabilities
      ? String(options.capabilities).split(',').map((cap: string) => cap.trim())
      : [];

    // Create task
    const task = createTask({
      id: uuidv4(),
      type: taskType,
      title,
      priority,
      estimatedDuration: duration,
      deadline,
      description: options.description ? String(options.description) : undefined,
      dependencies,
      requiredCapabilities,
      createdBy: options.createdBy ? String(options.createdBy) : undefined
    });

    // Add to scheduler
    sched.addTask(task);

    output({
      success: true,
      message: 'Task added successfully',
      task: formatTask(task)
    });
  });

// List tasks
taskCmd
  .command('list')
  .description('List tasks with optional filtering')
  .option('--status <status>', 'Filter by status')
  .option('--type <type>', 'Filter by type')
  .option('--agent <agentId>', 'Filter by assigned agent')
  .option('--pending', 'Show only pending tasks')
  .option('--overdue', 'Show only overdue tasks')
  .option('--urgent', 'Show only urgent tasks')
  .option('--limit <number>', 'Limit number of results', '50')
  .action((options: Record<string, unknown>) => {
    const sched = initializeScheduler();
    
    let tasks: Task[];
    
    if (options.status) {
      tasks = sched.getTasksByStatus(options.status as Task['status']);
    } else if (options.agent) {
      const allTasks = sched.getAllTasks();
      tasks = allTasks.filter(t => t.assignedAgent === String(options.agent));
    } else if (options.pending) {
      tasks = sched.getPendingTasks();
    } else {
      tasks = sched.getAllTasks();
    }

    // Apply additional filters
    if (options.type) {
      tasks = tasks.filter(t => t.type === String(options.type));
    }

    if (options.urgent) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      tasks = tasks.filter(t => 
        t.priority === 'urgent' || 
        (t.deadline && t.deadline - now < oneHour)
      );
    }

    if (options.overdue) {
      const now = Date.now();
      tasks = tasks.filter(t => 
        t.deadline && t.deadline < now && 
        t.status !== 'completed' && 
        t.status !== 'cancelled'
      );
    }

    // Apply limit
    const limit = parseInt(String(options.limit), 10);
    tasks = tasks.slice(0, limit);

    output({
      total: tasks.length,
      tasks: tasks.map(formatTask)
    });
  });

// Show task details
taskCmd
  .command('show')
  .description('Show detailed information about a specific task')
  .argument('<taskId>', 'Task ID')
  .action((taskId: string) => {
    const sched = initializeScheduler();
    const task = sched.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    output(formatTask(task));
  });

// Start task
taskCmd
  .command('start')
  .description('Mark a task as started')
  .argument('<taskId>', 'Task ID')
  .action((taskId: string) => {
    const sched = initializeScheduler();
    const task = sched.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    sched.startTask(taskId);

    output({
      success: true,
      message: 'Task started successfully',
      task: formatTask(task)
    });
  });

// Complete task
taskCmd
  .command('complete')
  .description('Mark a task as completed')
  .argument('<taskId>', 'Task ID')
  .action((taskId: string) => {
    const sched = initializeScheduler();
    const task = sched.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    sched.completeTask(taskId);

    output({
      success: true,
      message: 'Task completed successfully',
      task: formatTask(task)
    });
  });

// Fail task
taskCmd
  .command('fail')
  .description('Mark a task as failed')
  .argument('<taskId>', 'Task ID')
  .argument('<error>', 'Error message')
  .action((taskId: string, error: string) => {
    const sched = initializeScheduler();
    const task = sched.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    sched.failTask(taskId, error);

    output({
      success: true,
      message: 'Task marked as failed',
      task: formatTask(task)
    });
  });

// Reassign task
taskCmd
  .command('reassign')
  .description('Reassign a failed task to another agent')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId: string) => {
    const sched = initializeScheduler();
    const task = sched.getTask(taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      process.exit(1);
    }

    const decision = await sched.reassignTask(taskId);

    if (!decision) {
      output({
        success: false,
        message: 'No suitable agent available for reassignment'
      });
      process.exit(1);
    }

    output({
      success: true,
      message: 'Task reassigned successfully',
      decision: {
        taskId: decision.taskId,
        assignedAgent: decision.assignedAgent,
        confidence: decision.confidence,
        reasoning: decision.reasoning
      }
    });
  });

// ============================================================================
// Agent Commands
// ============================================================================

const agentCmd = program.command('agent').description('Agent management');

// List agents
agentCmd
  .command('list')
  .description('List all agents')
  .option('--available', 'Show only available agents')
  .option('--type <taskType>', 'Show agents capable of specific task type')
  .action((options: Record<string, unknown>) => {
    const sched = initializeScheduler();
    let agents = Array.from(sched.getAgents().values());

    // Apply filters
    if (options.available) {
      agents = agents.filter(a => a.availability);
    }

    if (options.type) {
      agents = agents.filter(a => 
        a.capabilities.taskTypes.includes(options.type as AgentTaskType)
      );
    }

    output({
      total: agents.length,
      agents: agents.map(formatAgent)
    });
  });

// Show agent details
agentCmd
  .command('show')
  .description('Show detailed information about a specific agent')
  .argument('<agentId>', 'Agent ID')
  .action((agentId: string) => {
    const sched = initializeScheduler();
    const agent = sched.getAgent(agentId);

    if (!agent) {
      console.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    output(formatAgent(agent));
  });

// Set agent availability
agentCmd
  .command('available')
  .description('Set agent availability')
  .argument('<agentId>', 'Agent ID')
  .argument('<available>', 'Availability (true|false)')
  .action((agentId: string, available: string) => {
    const sched = initializeScheduler();
    const agent = sched.getAgent(agentId);

    if (!agent) {
      console.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    const isAvailable = available.toLowerCase() === 'true';
    sched.setAgentAvailability(agentId, isAvailable);

    output({
      success: true,
      message: `Agent ${agentId} availability set to ${isAvailable}`,
      agent: formatAgent(agent)
    });
  });

// Get agent tasks
agentCmd
  .command('tasks')
  .description('Get tasks assigned to an agent')
  .argument('<agentId>', 'Agent ID')
  .action((agentId: string) => {
    const sched = initializeScheduler();
    const agent = sched.getAgent(agentId);

    if (!agent) {
      console.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    // Get tasks from task queue
    const allTasks = sched.getAllTasks();
    const agentTasks = allTasks.filter(
      t => t.assignedAgent === agentId && 
           t.status !== 'completed' && 
           t.status !== 'failed'
    );

    output({
      agentId,
      agentName: agent.name,
      taskCount: agentTasks.length,
      tasks: agentTasks.map(formatTask)
    });
  });

// ============================================================================
// Schedule Commands
// ============================================================================

const scheduleCmd = program.command('schedule').description('Schedule management');

// Trigger scheduling
scheduleCmd
  .command('trigger')
  .description('Trigger a scheduling cycle')
  .option('--batch-size <number>', 'Maximum tasks to schedule in this batch')
  .action(async (options) => {
    const sched = initializeScheduler();

    // Update batch size if specified
    if (options.batchSize) {
      sched.updateConfig({ maxBatchSize: parseInt(options.batchSize, 10) });
    }

    // Trigger scheduling
    const result = await sched.scheduleNextBatch();

    output(formatSchedulingResult(result));

    // Exit with error code if any tasks failed
    if (result.failed.length > 0) {
      process.exit(1);
    }
  });

// Show schedule statistics
scheduleCmd
  .command('stats')
  .description('Show scheduling statistics and metrics')
  .action(() => {
    const sched = initializeScheduler();

    const taskStats = sched.getTaskStats();
    const metrics = sched.getMetrics();
    const loadStats = sched.getLoadStats();
    const scalingSuggestion = sched.getScalingSuggestion();

    output({
      timestamp: new Date().toISOString(),
      taskStatistics: taskStats,
      schedulingMetrics: metrics,
      loadBalancing: loadStats,
      scaling: scalingSuggestion
    });
  });

// Show recent decisions
scheduleCmd
  .command('history')
  .description('Show recent scheduling decisions')
  .option('--limit <number>', 'Number of decisions to show', '10')
  .option('--agent <agentId>', 'Filter by agent ID')
  .action((options: Record<string, unknown>) => {
    const sched = initializeScheduler();
    
    let decisions: any[];
    if (options.agent) {
      decisions = sched.getScheduleHistory().getAgentDecisions(String(options.agent));
    } else {
      decisions = sched.getRecentDecisions(parseInt(String(options.limit), 10));
    }

    output({
      total: decisions.length,
      decisions: decisions.map(d => ({
        taskId: d.taskId,
        assignedAgent: d.assignedAgent,
        confidence: (d.confidence * 100).toFixed(1) + '%',
        reasoning: d.reasoning,
        alternatives: d.alternativeAgents,
        estimatedCompletion: new Date(d.estimatedCompletion).toLocaleString('zh-CN'),
        decisionTime: new Date(d.decisionTime).toLocaleString('zh-CN'),
        manualOverride: d.manualOverride || false
      }))
    });
  });

// ============================================================================
// System Commands
// ============================================================================

// Open dashboard
program
  .command('dashboard')
  .description('Open the web dashboard URL')
  .option('--url <url>', 'Custom dashboard URL', 'http://localhost:3000/dashboard')
  .action((options: Record<string, unknown>) => {
    console.log(`🌐 Opening dashboard: ${options.url}`);
    console.log('');
    console.log('Note: Make sure the AgentScheduler web interface is running.');
    console.log('Use: npm run dev (from the project root)');
    console.log('');
    console.log(`Dashboard URL: ${options.url}`);
  });

// Clear all tasks
program
  .command('clear')
  .description('Clear all tasks from the queue (use with caution!)')
  .option('--confirm', 'Confirm clearing without prompt')
  .action((options: Record<string, unknown>) => {
    if (!options.confirm) {
      console.error('⚠️  This will clear all tasks. Use --confirm to proceed.');
      process.exit(1);
    }

    const sched = initializeScheduler();
    sched.clearTasks();

    output({
      success: true,
      message: 'All tasks cleared successfully'
    });
  });

// Reset scheduler
program
  .command('reset')
  .description('Reset scheduler state (clears tasks, history, and resets agents)')
  .option('--confirm', 'Confirm reset without prompt')
  .action((options: Record<string, unknown>) => {
    if (!options.confirm) {
      console.error('⚠️  This will reset the entire scheduler. Use --confirm to proceed.');
      process.exit(1);
    }

    const sched = initializeScheduler();
    sched.reset();

    output({
      success: true,
      message: 'Scheduler reset successfully'
    });
  });

// Export state
program
  .command('export')
  .description('Export scheduler state to JSON')
  .option('--output <file>', 'Output file path (default: stdout)')
  .action((options: Record<string, unknown>) => {
    const sched = initializeScheduler();
    const state = sched.export();

    if (options.output) {
      const fs = require('fs');
      fs.writeFileSync(options.output, state);
      console.log(`State exported to: ${options.output}`);
    } else {
      console.log(state);
    }
  });

// Show scheduler config
program
  .command('config')
  .description('Show current scheduler configuration')
  .action(() => {
    const sched = initializeScheduler();
    const stats = sched.getTaskStats();
    const loadStats = sched.getLoadStats();
    const metrics = sched.getMetrics();

    output({
      scheduler: {
        version: '1.0.0',
        uptime: 'N/A (instance-based)'
      },
      statistics: stats,
      loadBalance: loadStats,
      metrics: {
        totalDecisions: metrics.totalDecisions,
        averageConfidence: (metrics.averageConfidence * 100).toFixed(1) + '%',
        automaticDecisions: metrics.automaticDecisions,
        manualOverrides: metrics.manualOverrides
      }
    });
  });

// ============================================================================
// Parse and execute
// ============================================================================

program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

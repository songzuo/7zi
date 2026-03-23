/**
 * A2A Agent Registry - Registry for managing available agents
 */


import { AgentRegistration, AgentRegistry } from './types';

/**
 * In-memory agent registry implementation
 */
export class InMemoryAgentRegistry implements AgentRegistry {
  private agents: Map<string, AgentRegistration> = new Map();
  private agentCapabilities: Map<string, Set<string>> = new Map();
  private agentSkills: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(autoCleanupIntervalMs: number = 60000) {
    // Auto-cleanup inactive agents every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactive(300000); // 5 minutes timeout
    }, autoCleanupIntervalMs);
  }

  /**
   * Register a new agent
   */
  register(agent: AgentRegistration): void {
    const now = new Date().toISOString();

    const registration: AgentRegistration = {
      id: agent.id || uuidv4(),
      name: agent.name,
      url: agent.url,
      capabilities: agent.capabilities || [],
      skills: agent.skills || [],
      status: agent.status || 'online',
      lastHeartbeat: agent.lastHeartbeat || now,
      load: agent.load,
      metadata: agent.metadata,
    };

    this.agents.set(registration.id, registration);

    // Index capabilities
    this.agentCapabilities.set(registration.id, new Set(registration.capabilities));

    // Index skills
    this.agentSkills.set(registration.id, new Set(registration.skills));
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.agentSkills.delete(agentId);

    return true;
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): AgentRegistration | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;

    // Return a copy to prevent external modification
    return { ...agent };
  }

  /**
   * Get all registered agents
   */
  getAll(): AgentRegistration[] {
    return Array.from(this.agents.values()).map(agent => ({ ...agent }));
  }

  /**
   * Get agents by capability
   */
  getByCapability(capability: string): AgentRegistration[] {
    return this.getAll().filter(agent =>
      this.agentCapabilities.get(agent.id)?.has(capability)
    );
  }

  /**
   * Get agents by skill
   */
  getBySkill(skill: string): AgentRegistration[] {
    return this.getAll().filter(agent =>
      this.agentSkills.get(agent.id)?.has(skill)
    );
  }

  /**
   * Get available (online and not busy) agents
   */
  getAvailable(): AgentRegistration[] {
    return this.getAll().filter(agent => agent.status === 'online');
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentRegistration['status']): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.status = status;
    return true;
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastHeartbeat = new Date().toISOString();
    return true;
  }

  /**
   * Cleanup inactive agents
   */
  cleanupInactive(timeoutMs: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [agentId, agent] of this.agents) {
      const lastHeartbeatTime = new Date(agent.lastHeartbeat).getTime();
      const inactiveTime = now - lastHeartbeatTime;

      if (inactiveTime > timeoutMs) {
        this.unregister(agentId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Find best agent for a task based on capabilities/skills and load
   */
  findBestAgent(options: {
    capabilities?: string[];
    skills?: string[];
    maxLoad?: number;
  }): AgentRegistration | undefined {
    let candidates = this.getAvailable();

    // Filter by capabilities
    if (options.capabilities && options.capabilities.length > 0) {
      candidates = candidates.filter(agent =>
        options.capabilities!.every(cap =>
          this.agentCapabilities.get(agent.id)?.has(cap)
        )
      );
    }

    // Filter by skills
    if (options.skills && options.skills.length > 0) {
      candidates = candidates.filter(agent =>
        options.skills!.every(skill =>
          this.agentSkills.get(agent.id)?.has(skill)
        )
      );
    }

    // Filter by load
    if (options.maxLoad !== undefined) {
      candidates = candidates.filter(agent =>
        (agent.load ?? 0) <= options.maxLoad!
      );
    }

    // Return the agent with the lowest load
    return candidates.sort((a, b) => (a.load ?? 0) - (b.load ?? 0))[0];
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    online: number;
    offline: number;
    busy: number;
    byCapability: Map<string, number>;
    bySkill: Map<string, number>;
  } {
    const agents = this.getAll();
    const byCapability = new Map<string, number>();
    const bySkill = new Map<string, number>();

    for (const agent of agents) {
      // Count capabilities
      for (const cap of agent.capabilities) {
        byCapability.set(cap, (byCapability.get(cap) || 0) + 1);
      }

      // Count skills
      for (const skill of agent.skills) {
        bySkill.set(skill, (bySkill.get(skill) || 0) + 1);
      }
    }

    return {
      total: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      offline: agents.filter(a => a.status === 'offline').length,
      busy: agents.filter(a => a.status === 'busy').length,
      byCapability,
      bySkill,
    };
  }

  /**
   * Stop auto-cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * File-based agent registry for persistence
 */
export class FileAgentRegistry implements AgentRegistry {
  private registry: InMemoryAgentRegistry;
  private filePath: string;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(filePath: string) {
    this.registry = new InMemoryAgentRegistry();
    this.filePath = filePath;

    // Auto-flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);

    // Load from file on startup
    this.load();
  }

  register(agent: AgentRegistration): void {
    this.registry.register(agent);
    this.flush();
  }

  unregister(agentId: string): boolean {
    const unregistered = this.registry.unregister(agentId);
    if (unregistered) this.flush();
    return unregistered;
  }

  get(agentId: string): AgentRegistration | undefined {
    return this.registry.get(agentId);
  }

  getAll(): AgentRegistration[] {
    return this.registry.getAll();
  }

  getByCapability(capability: string): AgentRegistration[] {
    return this.registry.getByCapability(capability);
  }

  getBySkill(skill: string): AgentRegistration[] {
    return this.registry.getBySkill(skill);
  }

  getAvailable(): AgentRegistration[] {
    return this.registry.getAvailable();
  }

  updateStatus(agentId: string, status: AgentRegistration['status']): boolean {
    const updated = this.registry.updateStatus(agentId, status);
    if (updated) this.flush();
    return updated;
  }

  updateHeartbeat(agentId: string): boolean {
    const updated = this.registry.updateHeartbeat(agentId);
    if (updated) this.flush();
    return updated;
  }

  cleanupInactive(timeoutMs: number): number {
    const cleaned = this.registry.cleanupInactive(timeoutMs);
    if (cleaned > 0) this.flush();
    return cleaned;
  }

  /**
   * Flush registry state to disk
   */
  flush(): void {
    // Implementation depends on environment (Node.js vs Edge)
    // For now, this is a placeholder
    // In production, use fs.writeFileSync or similar
  }

  /**
   * Load registry state from disk
   */
  load(): void {
    // Implementation depends on environment
    // For now, this is a placeholder
  }

  /**
   * Stop auto-flushing
   */
  destroy(): void {
    this.registry.destroy();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  // Forward other methods
  findBestAgent(options: {
    capabilities?: string[];
    skills?: string[];
    maxLoad?: number;
  }): AgentRegistration | undefined {
    return this.registry.findBestAgent(options);
  }

  getStats() {
    return this.registry.getStats();
  }
}

// Singleton instance
let registryInstance: InMemoryAgentRegistry | null = null;

export function getAgentRegistry(): InMemoryAgentRegistry {
  if (!registryInstance) {
    registryInstance = new InMemoryAgentRegistry();
  }
  return registryInstance;
}

export function resetAgentRegistry(): void {
  if (registryInstance) {
    registryInstance.destroy();
  }
  registryInstance = null;
}

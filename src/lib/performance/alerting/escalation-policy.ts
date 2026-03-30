/**
 * Alert Escalation Policy
 * Automatic escalation of unacknowledged alerts
 */

import type {
  PerformanceAlert,
  AlertLevel,
  AlertStatus,
} from './alerter';

// ========================================
// Types
// ========================================

export type EscalationAction =
  | 'notify'
  | 'increase_severity'
  | 'change_channel'
  | 'auto_acknowledge'
  | 'auto_resolve'
  | 'trigger_incident'
  | 'send_reminder';

export interface EscalationStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Delay before this step (ms) */
  delay: number;
  /** Action to take */
  action: EscalationAction;
  /** Action parameters */
  params?: Record<string, unknown>;
  /** Repeat this step */
  repeat?: number;
  /** Repeat interval (ms) */
  repeatInterval?: number;
  /** Condition to execute */
  condition?: EscalationCondition;
  /** Target channels for notify action */
  channels?: string[];
  /** Target severity for increase_severity action */
  targetSeverity?: AlertLevel;
  /** Target users/groups for notify action */
  targets?: string[];
  /** Message for send_reminder action */
  message?: string;
}

export interface EscalationCondition {
  /** Filter by alert level */
  level?: AlertLevel | AlertLevel[];
  /** Filter by alert category */
  category?: string | string[];
  /** Filter by alert source */
  source?: string | string[];
  /** Filter by alert status */
  status?: AlertStatus | AlertStatus[];
  /** Filter by custom predicate */
  custom?: (alert: PerformanceAlert) => boolean;
  /** Minimum occurrence count */
  minOccurrences?: number;
  /** Maximum occurrence count */
  maxOccurrences?: number;
}

export interface EscalationPolicy {
  /** Policy ID */
  id: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description?: string;
  /** Policy is active */
  active: boolean;
  /** Match conditions */
  matchConditions: EscalationCondition[];
  /** Escalation steps */
  steps: EscalationStep[];
  /** Created timestamp */
  createdAt: number;
  /** Created by */
  createdBy?: string;
  /** Last updated timestamp */
  updatedAt: number;
  /** Priority for policy matching */
  priority: number;
}

export interface EscalationState {
  /** Alert ID */
  alertId: string;
  /** Policy ID */
  policyId: string;
  /** Current step index */
  currentStep: number;
  /** Escalation started at */
  startedAt: number;
  /** Last action at */
  lastActionAt: number;
  /** Next action scheduled at */
  nextActionAt?: number;
  /** Actions taken */
  actions: EscalationActionRecord[];
  /** Is escalation complete */
  isComplete: boolean;
  /** Is escalation paused */
  isPaused: boolean;
  /** Pause reason */
  pauseReason?: string;
}

export interface EscalationActionRecord {
  /** Action type */
  action: EscalationAction;
  /** Step ID */
  stepId: string;
  /** Action timestamp */
  timestamp: number;
  /** Action result */
  result: 'success' | 'failed' | 'skipped';
  /** Result message */
  message?: string;
  /** Action params */
  params?: Record<string, unknown>;
}

export interface EscalationOptions {
  /** Default escalation delay (ms) */
  defaultDelay: number;
  /** Maximum escalation time (ms) */
  maxEscalationTime: number;
  /** Enable automatic escalation */
  autoEscalate: boolean;
  /** Default channels for escalation */
  defaultChannels: string[];
  /** Reminder interval (ms) */
  reminderInterval: number;
  /** Maximum reminders */
  maxReminders: number;
}

// ========================================
// Default Options
// ========================================

const DEFAULT_OPTIONS: EscalationOptions = {
  defaultDelay: 60000, // 1 minute
  maxEscalationTime: 86400000, // 24 hours
  autoEscalate: true,
  defaultChannels: ['dashboard'],
  reminderInterval: 300000, // 5 minutes
  maxReminders: 5,
};

// ========================================
// EscalationPolicyManager Class
// ========================================

export class EscalationPolicyManager {
  private policies: Map<string, EscalationPolicy> = new Map();
  private states: Map<string, EscalationState> = new Map();
  private options: EscalationOptions;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private channelSender?: (channel: string, alert: PerformanceAlert, message?: string) => Promise<void>;
  private incidentTrigger?: (alert: PerformanceAlert) => Promise<void>;
  private onAlertUpdate?: (alert: PerformanceAlert) => Promise<PerformanceAlert | null>;

  constructor(options?: Partial<EscalationOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setupDefaultPolicies();
  }

  // ========================================
  // Policy Management
  // ========================================

  /**
   * Add an escalation policy
   */
  addPolicy(policy: Omit<EscalationPolicy, 'id' | 'createdAt' | 'updatedAt'>): EscalationPolicy {
    const now = Date.now();
    const newPolicy: EscalationPolicy = {
      ...policy,
      id: `policy-${now.toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Update an escalation policy
   */
  updatePolicy(policyId: string, updates: Partial<EscalationPolicy>): EscalationPolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return null;
    }

    const updated = {
      ...policy,
      ...updates,
      updatedAt: Date.now(),
    };

    this.policies.set(policyId, updated);
    return updated;
  }

  /**
   * Remove an escalation policy
   */
  removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): EscalationPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getPolicies(): EscalationPolicy[] {
    return Array.from(this.policies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Setup default escalation policies
   */
  private setupDefaultPolicies(): void {
    // Critical alerts escalation
    this.addPolicy({
      name: 'Critical Alert Escalation',
      description: 'Escalate critical alerts that are not acknowledged within 5 minutes',
      active: true,
      priority: 100,
      matchConditions: [
        { level: 'critical' },
      ],
      steps: [
        {
          id: 'critical-step-1',
          name: 'Initial notification',
          delay: 0,
          action: 'notify',
          channels: ['dashboard', 'slack'],
          targets: ['on-call-engineers'],
        },
        {
          id: 'critical-step-2',
          name: 'First escalation',
          delay: 300000, // 5 minutes
          action: 'notify',
          channels: ['email', 'slack'],
          targets: ['team-lead', 'on-call-engineers'],
          message: 'Critical alert not acknowledged within 5 minutes. Please respond immediately.',
        },
        {
          id: 'critical-step-3',
          name: 'Trigger incident',
          delay: 900000, // 15 minutes
          action: 'trigger_incident',
          condition: { status: 'active' },
        },
        {
          id: 'critical-step-4',
          name: 'Manager notification',
          delay: 1800000, // 30 minutes
          action: 'notify',
          channels: ['email', 'pagerduty'],
          targets: ['engineering-manager'],
          message: 'Critical incident ongoing for 30 minutes without acknowledgment.',
        },
      ],
    });

    // Error alerts escalation
    this.addPolicy({
      name: 'Error Alert Escalation',
      description: 'Escalate error alerts that are not acknowledged within 15 minutes',
      active: true,
      priority: 80,
      matchConditions: [
        { level: 'error' },
      ],
      steps: [
        {
          id: 'error-step-1',
          name: 'Initial notification',
          delay: 0,
          action: 'notify',
          channels: ['dashboard'],
        },
        {
          id: 'error-step-2',
          name: 'Reminder notification',
          delay: 900000, // 15 minutes
          action: 'send_reminder',
          message: 'Error alert not acknowledged. Please review.',
        },
        {
          id: 'error-step-3',
          name: 'Team notification',
          delay: 3600000, // 1 hour
          action: 'notify',
          channels: ['slack'],
          targets: ['team-channel'],
          message: 'Error alert has been active for 1 hour without acknowledgment.',
        },
      ],
    });

    // Warning alerts escalation
    this.addPolicy({
      name: 'Warning Alert Escalation',
      description: 'Escalate warning alerts that persist for too long',
      active: true,
      priority: 60,
      matchConditions: [
        { level: 'warning' },
      ],
      steps: [
        {
          id: 'warning-step-1',
          name: 'Initial notification',
          delay: 0,
          action: 'notify',
          channels: ['dashboard'],
        },
        {
          id: 'warning-step-2',
          name: 'Reminder notification',
          delay: 3600000, // 1 hour
          action: 'send_reminder',
          message: 'Warning alert has been active for 1 hour.',
        },
        {
          id: 'warning-step-3',
          name: 'Increase severity',
          delay: 86400000, // 24 hours
          action: 'increase_severity',
          targetSeverity: 'error',
          condition: { minOccurrences: 5 },
        },
      ],
    });
  }

  // ========================================
  // Escalation Execution
  // ========================================

  /**
   * Start escalation for an alert
   */
  startEscalation(alert: PerformanceAlert): EscalationState | null {
    // Find matching policy
    const policy = this.findMatchingPolicy(alert);
    if (!policy) {
      return null;
    }

    // Check if escalation already exists
    const existingState = this.states.get(alert.id);
    if (existingState) {
      return existingState;
    }

    // Create escalation state
    const state: EscalationState = {
      alertId: alert.id,
      policyId: policy.id,
      currentStep: 0,
      startedAt: Date.now(),
      lastActionAt: Date.now(),
      actions: [],
      isComplete: false,
      isPaused: false,
    };

    this.states.set(alert.id, state);

    // Schedule first step if needed
    if (this.options.autoEscalate) {
      this.scheduleNextStep(alert, state);
    }

    return state;
  }

  /**
   * Stop escalation for an alert
   */
  stopEscalation(alertId: string): void {
    // Clear timer
    const timer = this.timers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(alertId);
    }

    // Remove state
    this.states.delete(alertId);
  }

  /**
   * Pause escalation for an alert
   */
  pauseEscalation(alertId: string, reason?: string): boolean {
    const state = this.states.get(alertId);
    if (!state) {
      return false;
    }

    state.isPaused = true;
    state.pauseReason = reason;

    // Clear timer
    const timer = this.timers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(alertId);
    }

    return true;
  }

  /**
   * Resume escalation for an alert
   */
  resumeEscalation(alertId: string): boolean {
    const state = this.states.get(alertId);
    if (!state) {
      return false;
    }

    state.isPaused = false;
    state.pauseReason = undefined;

    return true;
  }

  /**
   * Get escalation state for an alert
   */
  getEscalationState(alertId: string): EscalationState | undefined {
    return this.states.get(alertId);
  }

  /**
   * Find matching policy for an alert
   */
  private findMatchingPolicy(alert: PerformanceAlert): EscalationPolicy | undefined {
    const sortedPolicies = this.getPolicies();

    for (const policy of sortedPolicies) {
      if (!policy.active) continue;

      // Check if alert matches any condition
      const matches = policy.matchConditions.some(condition =>
        this.matchesCondition(alert, condition)
      );

      if (matches) {
        return policy;
      }
    }

    return undefined;
  }

  /**
   * Check if alert matches condition
   */
  private matchesCondition(alert: PerformanceAlert, condition: EscalationCondition): boolean {
    // Check level
    if (condition.level) {
      const levels = Array.isArray(condition.level) ? condition.level : [condition.level];
      if (!levels.includes(alert.level)) {
        return false;
      }
    }

    // Check category
    if (condition.category) {
      const categories = Array.isArray(condition.category) ? condition.category : [condition.category];
      if (!categories.includes(alert.category)) {
        return false;
      }
    }

    // Check source
    if (condition.source) {
      const sources = Array.isArray(condition.source) ? condition.source : [condition.source];
      if (!sources.includes(alert.source)) {
        return false;
      }
    }

    // Check status
    if (condition.status) {
      const statuses = Array.isArray(condition.status) ? condition.status : [condition.status];
      if (!statuses.includes(alert.status)) {
        return false;
      }
    }

    // Check occurrence count
    if (condition.minOccurrences && alert.occurrenceCount < condition.minOccurrences) {
      return false;
    }
    if (condition.maxOccurrences && alert.occurrenceCount > condition.maxOccurrences) {
      return false;
    }

    // Check custom condition
    if (condition.custom && !condition.custom(alert)) {
      return false;
    }

    return true;
  }

  /**
   * Schedule next escalation step
   */
  private scheduleNextStep(alert: PerformanceAlert, state: EscalationState): void {
    const policy = this.policies.get(state.policyId);
    if (!policy || state.isComplete || state.isPaused) {
      return;
    }

    // Check if max escalation time reached
    const elapsed = Date.now() - state.startedAt;
    if (elapsed > this.options.maxEscalationTime) {
      state.isComplete = true;
      return;
    }

    // Get current step
    const step = policy.steps[state.currentStep];
    if (!step) {
      state.isComplete = true;
      return;
    }

    // Check step condition
    if (step.condition && !this.matchesCondition(alert, step.condition)) {
      // Skip this step and move to next
      state.currentStep++;
      this.scheduleNextStep(alert, state);
      return;
    }

    // Calculate delay
    const delay = step.delay || this.options.defaultDelay;

    // Schedule step
    state.nextActionAt = Date.now() + delay;
    const timer = setTimeout(() => {
      this.executeStep(alert, state, step);
    }, delay);

    this.timers.set(alert.id, timer);
  }

  /**
   * Execute an escalation step
   */
  private async executeStep(
    alert: PerformanceAlert,
    state: EscalationState,
    step: EscalationStep
  ): Promise<void> {
    const actionRecord: EscalationActionRecord = {
      action: step.action,
      stepId: step.id,
      timestamp: Date.now(),
      result: 'success',
      params: step.params,
    };

    try {
      // Get latest alert state
      let currentAlert = alert;
      if (this.onAlertUpdate) {
        const updated = await this.onAlertUpdate(alert);
        if (updated) {
          currentAlert = updated;
        }
      }

      // Check if alert is still active
      if (currentAlert.status !== 'active') {
        actionRecord.result = 'skipped';
        actionRecord.message = `Alert is ${currentAlert.status}`;
        state.isComplete = true;
        state.actions.push(actionRecord);
        return;
      }

      // Check step condition again
      if (step.condition && !this.matchesCondition(currentAlert, step.condition)) {
        actionRecord.result = 'skipped';
        actionRecord.message = 'Condition not met';
        state.actions.push(actionRecord);
        state.currentStep++;
        this.scheduleNextStep(currentAlert, state);
        return;
      }

      // Execute action
      await this.executeAction(currentAlert, step);

      // Record action
      state.lastActionAt = Date.now();
      state.actions.push(actionRecord);

      // Check if step should repeat
      if (step.repeat && step.repeatInterval) {
        const repeatCount = state.actions.filter(
          a => a.stepId === step.id && a.result === 'success'
        ).length;

        if (repeatCount < step.repeat) {
          // Schedule repeat
          setTimeout(() => {
            const latestState = this.states.get(alert.id);
            if (latestState && !latestState.isComplete && !latestState.isPaused) {
              this.executeStep(alert, latestState, step);
            }
          }, step.repeatInterval);
        }
      }

      // Move to next step
      state.currentStep++;
      this.scheduleNextStep(currentAlert, state);
    } catch (error) {
      actionRecord.result = 'failed';
      actionRecord.message = error instanceof Error ? error.message : 'Unknown error';
      state.actions.push(actionRecord);
      console.error(`[EscalationPolicyManager] Step execution failed:`, error);
    }
  }

  /**
   * Execute a specific action
   */
  private async executeAction(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    switch (step.action) {
      case 'notify':
        await this.executeNotify(alert, step);
        break;

      case 'increase_severity':
        await this.executeIncreaseSeverity(alert, step);
        break;

      case 'send_reminder':
        await this.executeSendReminder(alert, step);
        break;

      case 'trigger_incident':
        await this.executeTriggerIncident(alert, step);
        break;

      case 'auto_acknowledge':
        await this.executeAutoAcknowledge(alert, step);
        break;

      case 'auto_resolve':
        await this.executeAutoResolve(alert, step);
        break;

      default:
        console.warn(`[EscalationPolicyManager] Unknown action: ${step.action}`);
    }
  }

  /**
   * Execute notify action
   */
  private async executeNotify(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    const channels = step.channels || this.options.defaultChannels;

    for (const channel of channels) {
      if (this.channelSender) {
        await this.channelSender(channel, alert, step.message);
      }
    }
  }

  /**
   * Execute increase severity action
   */
  private async executeIncreaseSeverity(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    if (!step.targetSeverity) {
      console.warn('[EscalationPolicyManager] increase_severity action requires targetSeverity');
      return;
    }

    // Update alert severity
    alert.level = step.targetSeverity;
    alert.updatedAt = Date.now();

    // Notify about severity increase
    if (this.channelSender) {
      await this.channelSender('dashboard', alert, `Alert severity increased to ${step.targetSeverity}`);
    }
  }

  /**
   * Execute send reminder action
   */
  private async executeSendReminder(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    const message = step.message || `Reminder: Alert ${alert.title} is still active`;

    if (this.channelSender) {
      await this.channelSender('dashboard', alert, message);
    }
  }

  /**
   * Execute trigger incident action
   */
  private async executeTriggerIncident(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    if (this.incidentTrigger) {
      await this.incidentTrigger(alert);
    } else {
      console.warn('[EscalationPolicyManager] No incident trigger configured');
    }
  }

  /**
   * Execute auto acknowledge action
   */
  private async executeAutoAcknowledge(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = 'system';
    alert.updatedAt = Date.now();

    // Pause escalation
    this.pauseEscalation(alert.id, 'Auto-acknowledged');
  }

  /**
   * Execute auto resolve action
   */
  private async executeAutoResolve(alert: PerformanceAlert, step: EscalationStep): Promise<void> {
    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.updatedAt = Date.now();

    // Stop escalation
    this.stopEscalation(alert.id);
  }

  // ========================================
  // Callbacks
  // ========================================

  /**
   * Set channel sender callback
   */
  setChannelSender(
    callback: (channel: string, alert: PerformanceAlert, message?: string) => Promise<void>
  ): void {
    this.channelSender = callback;
  }

  /**
   * Set incident trigger callback
   */
  setIncidentTrigger(callback: (alert: PerformanceAlert) => Promise<void>): void {
    this.incidentTrigger = callback;
  }

  /**
   * Set alert update callback
   */
  setOnAlertUpdate(callback: (alert: PerformanceAlert) => Promise<PerformanceAlert | null>): void {
    this.onAlertUpdate = callback;
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get escalation statistics
   */
  getEscalationStats(): {
    totalEscalations: number;
    activeEscalations: number;
    completedEscalations: number;
    pausedEscalations: number;
    byPolicy: Record<string, number>;
    avgStepsPerEscalation: number;
  } {
    const states = Array.from(this.states.values());

    let completed = 0;
    let paused = 0;
    const byPolicy: Record<string, number> = {};

    for (const state of states) {
      if (state.isComplete) completed++;
      if (state.isPaused) paused++;

      byPolicy[state.policyId] = (byPolicy[state.policyId] || 0) + 1;
    }

    const totalSteps = states.reduce((sum, s) => sum + s.actions.length, 0);

    return {
      totalEscalations: states.length,
      activeEscalations: states.length - completed - paused,
      completedEscalations: completed,
      pausedEscalations: paused,
      byPolicy,
      avgStepsPerEscalation: states.length > 0 ? totalSteps / states.length : 0,
    };
  }
}

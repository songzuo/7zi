/**
 * Health Monitor Module
 *
 * Distributed microservice health monitoring system.
 * Provides active health checking, passive reporting, failure detection,
 * automatic recovery, and real-time dashboard.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

// Core Types
export * from './types'

// Main Components
export { HealthMonitor } from './HealthMonitor'
export { HealthChecker } from './HealthChecker'
export { PassiveHealthReporter } from './PassiveHealthReporter'
export { FailureDetector } from './FailureDetector'
export { RecoveryManager } from './RecoveryManager'
export { HealthDashboard } from './HealthDashboard'

// Default export
export { HealthMonitor as default } from './HealthMonitor'

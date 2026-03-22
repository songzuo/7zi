import { probes } from '@/lib/monitoring';

/**
 * Kubernetes Liveness Probe
 * GET /api/health/live
 * 
 * Used by Kubernetes to determine if the container should be restarted.
 * Should always return 200 if the process is running.
 */
export const GET = probes.liveness;
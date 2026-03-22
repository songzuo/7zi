import { probes } from '@/lib/monitoring';

/**
 * Kubernetes Readiness Probe
 * GET /api/health/ready
 * 
 * Used by Kubernetes to determine if the container is ready to accept traffic.
 * Should return 200 only when all critical dependencies are available.
 */
export const GET = probes.readiness;
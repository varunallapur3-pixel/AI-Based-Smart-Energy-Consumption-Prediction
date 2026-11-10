/**
 * VOLTIX Health Check API Service.
 * Probes backend readiness, active database connectivity, and round-trip latency.
 */

import { apiClient, ApiClientError } from './apiClient';
import { HealthResponse } from './types';

export interface HealthCheckResult {
  isBackendReachable: boolean;
  status: 'healthy' | 'unhealthy' | 'disconnected';
  databaseConnectivity: 'connected' | 'disconnected' | 'unknown';
  backendVersion: string;
  databaseLatencyMs: number | null;
  environment: string;
  errorMessage?: string;
  raw?: HealthResponse;
}

/**
 * Execute health check probe against GET /api/health.
 * Handles successful responses, 503 service unavailable, and network timeouts.
 */
export async function checkHealth(signal?: AbortSignal): Promise<HealthCheckResult> {
  try {
    const raw = await apiClient.get<HealthResponse>('/health', { signal });

    const isConnected = raw.database_connectivity === 'connected';
    return {
      isBackendReachable: true,
      status: raw.status === 'healthy' ? 'healthy' : 'unhealthy',
      databaseConnectivity: isConnected ? 'connected' : 'disconnected',
      backendVersion: raw.backend_version || 'unknown',
      databaseLatencyMs: raw.database_latency_ms ?? null,
      environment: raw.environment || 'unknown',
      raw,
    };
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      // Backend responded with HTTP status (e.g. 503 Unhealthy)
      if (err.status === 503) {
        return {
          isBackendReachable: true,
          status: 'unhealthy',
          databaseConnectivity: 'disconnected',
          backendVersion: 'unknown',
          databaseLatencyMs: null,
          environment: 'unknown',
          errorMessage: err.detail || 'Database unreachable.',
        };
      }

      // Network failure / connection refused
      return {
        isBackendReachable: false,
        status: 'disconnected',
        databaseConnectivity: 'unknown',
        backendVersion: 'unknown',
        databaseLatencyMs: null,
        environment: 'unknown',
        errorMessage: err.message || 'Backend server is offline or unreachable.',
      };
    }

    const fallbackError = err as Error;
    return {
      isBackendReachable: false,
      status: 'disconnected',
      databaseConnectivity: 'unknown',
      backendVersion: 'unknown',
      databaseLatencyMs: null,
      environment: 'unknown',
      errorMessage: fallbackError.message || 'Unknown network error.',
    };
  }
}

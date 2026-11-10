/**
 * VOLTIX Device API Service.
 * Provides typed methods for interacting with backend Device endpoints:
 * - GET    /api/devices
 * - GET    /api/devices/stats
 * - POST   /api/devices
 * - GET    /api/devices/{device_id}
 * - PUT    /api/devices/{device_id}
 * - DELETE /api/devices/{device_id}
 */

import { apiClient } from './apiClient';
import {
  DeviceResponse,
  DeviceCreate,
  DeviceUpdate,
  DeviceStatsResponse,
  DeviceDeleteResponse,
  BackendDeviceType,
  BackendDeviceStatus,
} from './types';

export interface DeviceListParams {
  device_type?: BackendDeviceType;
  status?: BackendDeviceStatus;
  location?: string;
  skip?: number;
  limit?: number;
}

export const deviceApi = {
  /**
   * GET /api/devices
   * Retrieve registered devices with optional query filtering and pagination.
   */
  async getDevices(params?: DeviceListParams, signal?: AbortSignal): Promise<DeviceResponse[]> {
    return apiClient.get<DeviceResponse[]>('/devices', {
      params: params as Record<string, string | number | boolean | null | undefined>,
      signal,
    });
  },

  /**
   * GET /api/devices/stats
   * Retrieve fleet aggregation statistics partitioned by type and status.
   */
  async getDeviceStats(signal?: AbortSignal): Promise<DeviceStatsResponse> {
    return apiClient.get<DeviceStatsResponse>('/devices/stats', { signal });
  },

  /**
   * GET /api/devices/{device_id}
   * Retrieve complete metadata for a specific device by its unique ID.
   */
  async getDevice(deviceId: string, signal?: AbortSignal): Promise<DeviceResponse> {
    return apiClient.get<DeviceResponse>(`/devices/${encodeURIComponent(deviceId)}`, { signal });
  },

  /**
   * POST /api/devices
   * Register a new device node (virtual / simulated or physical).
   */
  async createDevice(data: DeviceCreate, signal?: AbortSignal): Promise<DeviceResponse> {
    return apiClient.post<DeviceResponse>('/devices', data, { signal });
  },

  /**
   * PUT /api/devices/{device_id}
   * Update metadata, location, status, or firmware version for an existing device.
   */
  async updateDevice(
    deviceId: string,
    data: DeviceUpdate,
    signal?: AbortSignal
  ): Promise<DeviceResponse> {
    return apiClient.put<DeviceResponse>(`/devices/${encodeURIComponent(deviceId)}`, data, { signal });
  },

  /**
   * DELETE /api/devices/{device_id}
   * Permanently remove a device from the backend registry.
   */
  async deleteDevice(deviceId: string, signal?: AbortSignal): Promise<DeviceDeleteResponse> {
    return apiClient.delete<DeviceDeleteResponse>(`/devices/${encodeURIComponent(deviceId)}`, { signal });
  },
};

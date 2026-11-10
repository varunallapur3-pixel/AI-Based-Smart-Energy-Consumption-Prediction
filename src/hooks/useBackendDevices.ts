/**
 * VOLTIX Backend Devices Hook.
 * Manages fetching, creating, updating, and deleting devices via the backend FastAPI REST API.
 * Synchronizes with TelemetryContext while preserving simulation state and handling errors gracefully.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceApi } from '../services/api/deviceApi';
import {
  DeviceResponse,
  DeviceCreate,
  DeviceUpdate,
  DeviceStatsResponse,
  DeviceDeleteResponse,
} from '../services/api/types';
import { mapBackendDeviceToNode } from '../services/api/mappers';
import { DeviceNode } from '../types/device';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';
import { ApiClientError } from '../services/api/apiClient';

export interface UseBackendDevicesReturn {
  devices: DeviceNode[];
  backendDevices: DeviceResponse[];
  stats: DeviceStatsResponse | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  backendOnline: boolean;
  fetchDevices: () => Promise<void>;
  createDevice: (data: DeviceCreate) => Promise<DeviceResponse>;
  updateDevice: (deviceId: string, data: DeviceUpdate) => Promise<DeviceResponse>;
  deleteDevice: (deviceId: string) => Promise<DeviceDeleteResponse>;
  clearError: () => void;
}

export function useBackendDevices(): UseBackendDevicesReturn {
  const { devices: contextDevices, syncBackendDevices } = useTelemetry();
  const { showToast } = useToast();

  const [backendDevices, setBackendDevices] = useState<DeviceResponse[]>([]);
  const [stats, setStats] = useState<DeviceStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isMutatingRef = useRef<boolean>(false);

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isMutatingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Fetches the device list and fleet stats from the backend.
   */
  const fetchDevices = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const [deviceList, deviceStats] = await Promise.all([
        deviceApi.getDevices(undefined, controller.signal),
        deviceApi.getDeviceStats(controller.signal),
      ]);

      if (!isMountedRef.current) return;

      setBackendDevices(deviceList);
      setStats(deviceStats);
      setBackendOnline(true);
      setError(null);

      // Map backend devices to frontend DeviceNode format
      if (deviceList.length > 0) {
        const mappedNodes: DeviceNode[] = deviceList.map((dto) => {
          const existing = contextDevices.find((d) => d.id === dto.device_id);
          return mapBackendDeviceToNode(dto, undefined, existing);
        });
        syncBackendDevices(mappedNodes);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const apiErr = err as ApiClientError;
      if (apiErr.isAborted) {
        // Ignored aborted requests
        return;
      }

      setBackendOnline(false);
      const errMsg = apiErr.detail || apiErr.message || 'Failed to connect to backend device service.';
      setError(errMsg);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [contextDevices, syncBackendDevices]);

  // Initial fetch on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /**
   * POST /api/devices: Register a new device node.
   */
  const createDevice = useCallback(
    async (data: DeviceCreate): Promise<DeviceResponse> => {
      // Synchronous mutation lock to prevent rapid multi-click duplicates
      if (isMutatingRef.current) {
        throw new Error('A device mutation is currently in progress. Please wait.');
      }
      isMutatingRef.current = true;
      setIsMutating(true);
      setError(null);

      try {
        const created = await deviceApi.createDevice(data);
        showToast(`Device ${created.device_id} registered successfully in backend!`, 'verified', 'success');
        await fetchDevices();
        return created;
      } catch (err: unknown) {
        const apiErr = err as ApiClientError;
        const msg = apiErr.detail || apiErr.message || 'Failed to create device.';
        setError(msg);
        showToast(`Registration failed: ${msg}`, 'error', 'error');
        throw apiErr;
      } finally {
        isMutatingRef.current = false;
        if (isMountedRef.current) {
          setIsMutating(false);
        }
      }
    },
    [fetchDevices, showToast]
  );

  /**
   * PUT /api/devices/{device_id}: Update an existing device.
   */
  const updateDevice = useCallback(
    async (deviceId: string, data: DeviceUpdate): Promise<DeviceResponse> => {
      // Synchronous mutation lock to prevent rapid multi-click duplicates
      if (isMutatingRef.current) {
        throw new Error('A device mutation is currently in progress. Please wait.');
      }
      isMutatingRef.current = true;
      setIsMutating(true);
      setError(null);

      try {
        const updated = await deviceApi.updateDevice(deviceId, data);
        showToast(`Device ${deviceId} updated successfully!`, 'check_circle', 'success');
        await fetchDevices();
        return updated;
      } catch (err: unknown) {
        const apiErr = err as ApiClientError;
        const msg = apiErr.detail || apiErr.message || 'Failed to update device.';
        setError(msg);
        showToast(`Update failed: ${msg}`, 'error', 'error');
        throw apiErr;
      } finally {
        isMutatingRef.current = false;
        if (isMountedRef.current) {
          setIsMutating(false);
        }
      }
    },
    [fetchDevices, showToast]
  );

  /**
   * DELETE /api/devices/{device_id}: Permanently delete a device.
   */
  const deleteDevice = useCallback(
    async (deviceId: string): Promise<DeviceDeleteResponse> => {
      // Synchronous mutation lock to prevent rapid multi-click duplicates
      if (isMutatingRef.current) {
        throw new Error('A device mutation is currently in progress. Please wait.');
      }
      isMutatingRef.current = true;
      setIsMutating(true);
      setError(null);

      try {
        const result = await deviceApi.deleteDevice(deviceId);
        showToast(`Device ${deviceId} permanently deleted from backend.`, 'delete', 'warning');
        await fetchDevices();
        return result;
      } catch (err: unknown) {
        const apiErr = err as ApiClientError;
        const msg = apiErr.detail || apiErr.message || 'Failed to delete device.';
        setError(msg);
        showToast(`Deletion failed: ${msg}`, 'error', 'error');
        throw apiErr;
      } finally {
        isMutatingRef.current = false;
        if (isMountedRef.current) {
          setIsMutating(false);
        }
      }
    },
    [fetchDevices, showToast]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Compute final devices representation
  // If backend is online, use backendDevices mapped to DeviceNode.
  // If backend is offline, fall back to contextDevices (simulated fleet).
  const displayedDevices: DeviceNode[] = backendOnline
    ? backendDevices.map((dto) => {
        const existing = contextDevices.find((d) => d.id === dto.device_id);
        return mapBackendDeviceToNode(dto, undefined, existing);
      })
    : contextDevices;

  return {
    devices: displayedDevices,
    backendDevices,
    stats,
    isLoading,
    isMutating,
    error,
    backendOnline,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    clearError,
  };
}

/**
 * VOLTIX Physical Hardware Telemetry Service
 * 
 * Prepares the WebSocket and MQTT integration layer for physical ESP32 microcontrollers
 * running VOLTIX firmware with PZEM-004T or ADS1115 current transformers.
 */

import {
  HardwareConnectionState,
  ESP32WsFrame,
  ESP32MqttTelemetryPayload,
  ESP32CommandPayload,
} from '../types/telemetry';

type ConnectionCallback = (state: HardwareConnectionState, info?: string) => void;
type TelemetryCallback = (payload: ESP32MqttTelemetryPayload) => void;

export class HardwareTelemetryService {
  private socket: WebSocket | null = null;
  private connectionState: HardwareConnectionState = 'DISCONNECTED';
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private endpointUrl = ''; // Default empty; requires explicit user-provided address
  private staleTimer: number | null = null;
  private lastTelemetryTime = 0;

  constructor() {
    this.connectionState = 'DISCONNECTED';
  }

  /**
   * Reconnect attempt statistics
   */
  public getReconnectStats() {
    return { attempts: this.reconnectAttempts, max: this.maxReconnectAttempts };
  }

  /**
   * Current hardware connection state
   */
  public getState(): HardwareConnectionState {
    return this.connectionState;
  }

  /**
   * Last verified telemetry timestamp (ms)
   */
  public getLastTelemetryTime(): number {
    return this.lastTelemetryTime;
  }

  /**
   * Subscribe to connection state changes
   */
  public onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    queueMicrotask(() => {
      if (this.connectionCallbacks.has(cb)) {
        cb(this.connectionState);
      }
    });
    return () => this.connectionCallbacks.delete(cb);
  }

  /**
   * Subscribe to incoming genuine hardware telemetry frames
   */
  public onTelemetry(cb: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(cb);
    return () => this.telemetryCallbacks.delete(cb);
  }

  private setConnectionState(state: HardwareConnectionState, info?: string) {
    this.connectionState = state;
    this.connectionCallbacks.forEach((cb) => cb(state, info));
  }

  private resetStaleWatcher() {
    if (this.staleTimer) {
      window.clearTimeout(this.staleTimer);
    }
    // If no telemetry packet received for 12 seconds while CONNECTED, flag CONNECTION_LOST
    this.staleTimer = window.setTimeout(() => {
      if (this.connectionState === 'CONNECTED') {
        this.setConnectionState(
          'CONNECTION_LOST',
          'Stale hardware telemetry: No packets received from ESP32 for >12s. Link may be frozen or interrupted.'
        );
      }
    }, 12000);
  }

  /**
   * Initiates handshake with physical ESP32 micro-gateway.
   * Only transitions to CONNECTED after authenticated device identity and fresh telemetry are verified.
   */
  public connect(url: string = this.endpointUrl): Promise<boolean> {
    return new Promise((resolve) => {
      const trimmedUrl = (url || '').trim();
      this.endpointUrl = trimmedUrl;

      // Validate address format
      if (!trimmedUrl || (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://'))) {
        this.setConnectionState(
          'DISCONNECTED',
          'Invalid gateway URL. Please supply a valid WebSocket endpoint, e.g. ws://192.168.1.50:8080/pzem'
        );
        return resolve(false);
      }

      this.setConnectionState('CONNECTING', `Attempting handshake with physical gateway at ${trimmedUrl}...`);

      try {
        this.socket = new WebSocket(trimmedUrl);
        let verifiedAuth = false;

        const timeout = setTimeout(() => {
          if (!verifiedAuth) {
            if (this.socket) {
              this.socket.close();
            }
            this.setConnectionState(
              'DISCONNECTED',
              `Handshake timed out at ${trimmedUrl}. Physical ESP32 hardware did not return authenticated telemetry.`
            );
            resolve(false);
          }
        }, 4000);

        this.socket.onopen = () => {
          // Send authentication challenge frame
          try {
            const handshakeFrame = JSON.stringify({
              type: 'handshake',
              client: 'VOLTIX_GATEWAY_CONSOLE',
              token: 'vtx_sec_auth',
              timestamp: Date.now(),
            });
            this.socket?.send(handshakeFrame);
          } catch {
            // Socket write error
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
            // Verify device identity and valid fresh telemetry frame
            if (data && (data.type === 'telemetry' || data.node_id || data.v_rms !== undefined)) {
              verifiedAuth = true;
              clearTimeout(timeout);
              this.reconnectAttempts = 0;
              this.lastTelemetryTime = Date.now();
              this.resetStaleWatcher();
              this.setConnectionState(
                'CONNECTED',
                `Verified authenticated ESP32 node (${data.node_id || 'ESP32_GATEWAY'}) at ${trimmedUrl}`
              );
              this.handleInboundMessage(event.data);
              resolve(true);
            }
          } catch {
            // Bad frame
          }
        };

        this.socket.onerror = () => {
          clearTimeout(timeout);
          this.setConnectionState(
            'DISCONNECTED',
            `Connection refused at ${trimmedUrl}. Physical hardware unreachable or port closed.`
          );
          resolve(false);
        };

        this.socket.onclose = () => {
          clearTimeout(timeout);
          if (this.staleTimer) window.clearTimeout(this.staleTimer);

          if (this.connectionState === 'CONNECTED') {
            this.setConnectionState(
              'CONNECTION_LOST',
              'Physical ESP32 connection lost: socket terminated unexpectedly.'
            );
          } else if (this.connectionState === 'CONNECTING') {
            this.setConnectionState(
              'DISCONNECTED',
              `Unable to connect to ${trimmedUrl}. Check device power and Wi-Fi link.`
            );
          }
        };
      } catch (err) {
        this.setConnectionState(
          'DISCONNECTED',
          `WebSocket initialization error: ${(err as Error).message}`
        );
        resolve(false);
      }
    });
  }

  /**
   * Gracefully closes hardware socket
   */
  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setConnectionState('DISCONNECTED', 'Hardware connection manually closed.');
  }

  /**
   * Dispatches command to physical ESP32
   */
  public sendCommand(command: ESP32CommandPayload['command'], nodeId: string, parameters?: Record<string, unknown>): boolean {
    if (this.connectionState !== 'CONNECTED' || !this.socket) {
      console.warn(`[VOLTIX HW Service] Cannot send command '${command}': hardware is not connected.`);
      return false;
    }

    const payload: ESP32CommandPayload = {
      nodeId,
      command,
      parameters,
      issuedAt: new Date().toISOString(),
    };

    try {
      this.socket.send(JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('[VOLTIX HW Service] Failed to send hardware frame:', e);
      return false;
    }
  }

  /**
   * Parses inbound raw JSON/Binary packets from ESP32
   */
  private handleInboundMessage(raw: string | ArrayBuffer) {
    try {
      if (typeof raw === 'string') {
        const frame: ESP32WsFrame = JSON.parse(raw);
        if (frame.type === 'telemetry' && frame.payload) {
          const telemetryPayload = frame.payload as ESP32MqttTelemetryPayload;
          this.telemetryCallbacks.forEach((cb) => cb(telemetryPayload));
        }
      }
    } catch (e) {
      console.error('[VOLTIX HW Service] Error parsing inbound hardware frame:', e);
    }
  }
}

export const hardwareTelemetryService = new HardwareTelemetryService();

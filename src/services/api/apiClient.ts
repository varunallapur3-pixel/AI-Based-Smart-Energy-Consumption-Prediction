/**
 * VOLTIX Centralized Fetch-based API Client.
 * Handles environment-based URL configuration, request serialization,
 * error parsing, AbortController cancellation, and network resilience.
 */

import { ApiErrorResponse, ApiValidationErrorItem } from './types';

export class ApiClientError extends Error {
  public status: number;
  public statusText: string;
  public detail: string;
  public isNetworkError: boolean;
  public isAborted: boolean;
  public validationErrors?: ApiValidationErrorItem[];

  constructor(options: {
    message: string;
    status?: number;
    statusText?: string;
    detail?: string;
    isNetworkError?: boolean;
    isAborted?: boolean;
    validationErrors?: ApiValidationErrorItem[];
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.status = options.status || 0;
    this.statusText = options.statusText || '';
    this.detail = options.detail || options.message;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isAborted = Boolean(options.isAborted);
    this.validationErrors = options.validationErrors;
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | (string | number)[]
>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: QueryParams;
  body?: unknown;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Read from environment variable or fallback to relative '/api' proxy
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    this.baseUrl = (baseUrl || envUrl || '/api').replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(newUrl: string): void {
    this.baseUrl = newUrl.replace(/\/+$/, '');
  }

  /**
   * Builds the complete URL appending serialized query parameters.
   */
  public buildUrl(endpoint: string, params?: QueryParams): string {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (this.baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.slice(4);
    }
    const baseWithEndpoint = `${this.baseUrl}${cleanEndpoint}`;

    if (!params) {
      return baseWithEndpoint;
    }

    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val === null || val === undefined) {
        continue;
      }
      if (Array.isArray(val)) {
        val.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(val));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${baseWithEndpoint}?${queryString}` : baseWithEndpoint;
  }

  /**
   * Core request executor using native browser fetch API.
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, body, headers, ...restOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const mergedHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...((headers as Record<string, string>) || {}),
    };

    let serializedBody: string | undefined;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        serializedBody = body;
      } else {
        serializedBody = JSON.stringify(body);
        if (!mergedHeaders['Content-Type']) {
          mergedHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...restOptions,
        headers: mergedHeaders,
        body: serializedBody,
      });
    } catch (err: unknown) {
      const error = err as Error;
      const isAbort = error.name === 'AbortError';
      throw new ApiClientError({
        message: isAbort
          ? 'Request was cancelled.'
          : `Network request to '${url}' failed: ${error.message || 'Server unreachable'}`,
        isNetworkError: !isAbort,
        isAborted: isAbort,
      });
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      let detailMsg = `HTTP ${response.status}: ${response.statusText}`;
      let validationErrors: ApiValidationErrorItem[] | undefined;

      try {
        const errorJson: ApiErrorResponse = await response.json();
        if (typeof errorJson.detail === 'string') {
          detailMsg = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          validationErrors = errorJson.detail;
          detailMsg = errorJson.detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
        }
      } catch {
        // Response was not JSON
        try {
          const rawText = await response.text();
          if (rawText.trim()) {
            detailMsg = rawText.trim();
          }
        } catch {
          // Ignore text parse errors
        }
      }

      throw new ApiClientError({
        message: detailMsg,
        status: response.status,
        statusText: response.statusText,
        detail: detailMsg,
        validationErrors,
        isNetworkError: false,
        isAborted: false,
      });
    }

    // Parse JSON success payload
    try {
      return (await response.json()) as T;
    } catch (jsonErr) {
      throw new ApiClientError({
        message: 'Failed to parse JSON response from server.',
        status: response.status,
        statusText: response.statusText,
        detail: String(jsonErr),
      });
    }
  }

  // Convenience HTTP methods
  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance for platform-wide reuse
export const apiClient = new ApiClient();

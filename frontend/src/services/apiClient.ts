import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { env } from '@/config/env';

/**
 * Centralised Axios instance.
 * - Reads base URL from environment variable — never hardcoded.
 * - Attaches Cognito id-token as Bearer on every request.
 * - Handles 401 by attempting a session refresh before giving up.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// ── Request interceptor: attach auth token ──────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Not authenticated — let the request proceed; 401 will be handled below
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: normalise errors ──────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Force token refresh
        const session = await fetchAuthSession({ forceRefresh: true });
        const token = session.tokens?.idToken?.toString();
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed — caller will receive the 401
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

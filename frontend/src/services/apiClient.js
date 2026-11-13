import { API_BASE_URL } from '../config/api';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', token = null, body = null } = {}) {
  const headers = {
    Accept: 'application/json',
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const code = data?.error?.code || 'HTTP_ERROR';
      const msg = data?.error?.message || `Request failed (${res.status})`;
      throw new ApiError(res.status, code, msg);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Request timed out. Check your server connection.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach StudyWallah server.');
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  registerFreedom: (payload) =>
    request('/api/v1/auth/register-freedom', { method: 'POST', body: payload }),

  joinSecret: (payload) =>
    request('/api/v1/auth/join-secret', { method: 'POST', body: payload }),

  login: (payload) =>
    request('/api/v1/auth/login', { method: 'POST', body: payload }),

  me: (token) =>
    request('/api/v1/auth/me', { method: 'GET', token }),

  getNeetUpdates: () =>
    request('/api/v1/public/neet-updates', { method: 'GET' }),

  getFreedomInvitation: (token) =>
    request('/api/v1/freedom/invitation', { method: 'GET', token }),

  getFreedomDashboard: (token) =>
    request('/api/v1/freedom/dashboard', { method: 'GET', token }),

  getFreedomSignals: (token, page = 1, limit = 20) =>
    request(`/api/v1/freedom/signals?page=${page}&limit=${limit}`, { method: 'GET', token }),

  viewedAllSignals: (token) =>
    request('/api/v1/freedom/signals/viewed-all', { method: 'POST', token }),

  createSecretSignal: (token, content) =>
    request('/api/v1/secret/signals', { method: 'POST', token, body: { content } }),

  getSecretSignalStatus: (token) =>
    request('/api/v1/secret/signals/status', { method: 'GET', token }),
};

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  `${window.location.protocol}//${window.location.hostname}:3001`;
const BASE = `${API_BASE}/api`;


/**
 * Retrieves the active JWT authentication token.
 * @returns {string|null} The stored IMMS token or null.
 */
function getToken() {
  return localStorage.getItem('imms_token');
}

function persistSession(data) {
  if (data?.token) localStorage.setItem('imms_token', data.token);
  if (data?.user) localStorage.setItem('imms_user', JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem('imms_token');
  localStorage.removeItem('imms_user');
}

async function refreshAccessToken() {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (data?.token) {
    persistSession(data);
  }
  return data;
}

/**
 * Standardized isomorphic HTTP request handler.
 * Applies Bearer tokens and gracefully intercepts 401 Unauthorized responses.
 * @param {string} path - The API endpoint relative to base URL.
 * @param {RequestInit} [options={}] - Fetch API initialization options.
 * @returns {Promise<any>} The parsed JSON payload or throws an Error.
 */
async function request(path, options = {}, retry = true) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && !['/auth/login', '/auth/refresh'].includes(path)) {
    if (retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed?.token) {
        return request(path, options, false);
      }
    }

    clearSession();
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) throw new Error('System infrastructure error. Please contact NOC support.');
    if (res.status === 404) throw new Error('Requested resource not found.');
    if (res.status === 403) throw new Error('Access denied. Insufficient permissions.');
    throw new Error(data.error || `Error ${res.status}: Action could not be completed.`);
  }
  return data;
}

export const api = {
  // Auth
  login: async (body) => {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    persistSession(data);
    return data;
  },
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  // Incidents
  getIncidents: () => request('/incidents'),
  getIncident: (id) => request(`/incidents/${id}`),
  getHistory: (params = {}) => request(`/incidents/history?${new URLSearchParams(params)}`),
  createIncident: (body) => request('/incidents', { method: 'POST', body: JSON.stringify(body) }),
  updateIncident: (id, body) => request(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  startAction: (id) => request(`/incidents/${id}/start`, { method: 'POST' }),
  pauseIncident: (id, body) => request(`/incidents/${id}/pause`, { method: 'POST', body: JSON.stringify(body) }),
  resumeIncident: (id) => request(`/incidents/${id}/resume`, { method: 'POST' }),
  closeIncident: (id, body) => request(`/incidents/${id}/close`, { method: 'POST', body: JSON.stringify(body || {}) }),
  getRecurringInfo: (id) => request(`/incidents/${id}/recurring`),
  deleteIncidents: (body) => request('/incidents/batch', { method: 'DELETE', body: JSON.stringify(body) }),
  getNotifications: () => request('/incidents/notifications'),
  markNotificationRead: (id) => request(`/incidents/notifications/${id}/read`, { method: 'PUT' }),

  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getDuration: (params = {}) => request(`/analytics/duration?${new URLSearchParams(params)}`),
  getSla: (params = {}) => request(`/analytics/sla?${new URLSearchParams(params)}`),
  getRootCause: (params = {}) => request(`/analytics/root-cause?${new URLSearchParams(params)}`),
  getTechPerf: (params = {}) => request(`/analytics/technician-perf?${new URLSearchParams(params)}`),
  getTroubleMapData: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);
    return request(`/analytics/trouble-map?${params.toString()}`);
  },

  // Master Data
  getCustomers: () => request('/master/customers'),
  createCustomer: (body) => request('/master/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) => request(`/master/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/master/customers/${id}`, { method: 'DELETE' }),
  uploadCustomers: (customers) => request('/master/customers/batch', { method: 'POST', body: JSON.stringify({ customers }) }),
  getCustomersWithMissingCoords: () => request('/master/customers/missing-coords'),
  autoGeocodeCustomers: (ids) => request('/master/customers/auto-geocode', { method: 'POST', body: JSON.stringify({ ids }) }),

  getDistribusiWithMissingCoords: () => request('/master/distribusi/missing-coords'),
  autoGeocodeDistribusi: (ids) => request('/master/distribusi/auto-geocode', { method: 'POST', body: JSON.stringify({ ids }) }),
  getDistributionTrouble: (start, end) => request(`/analytics/distribution-trouble?start_date=${start || ''}&end_date=${end || ''}`),

  getClassifications: () => request('/master/classifications'),
  createClassification: (body) => request('/master/classifications', { method: 'POST', body: JSON.stringify(body) }),
  updateClassification: (id, body) => request(`/master/classifications/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteClassification: (id) => request(`/master/classifications/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/master/users'),
  createUser: (body) => request('/master/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/master/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/master/users/${id}`, { method: 'DELETE' }),

  getTechnicalSupport: () => request('/master/technical-support'),
  createTechnicalSupport: (body) => request('/master/technical-support', { method: 'POST', body: JSON.stringify(body) }),
  updateTechnicalSupport: (id, body) => request(`/master/technical-support/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTechnicalSupport: (id) => request(`/master/technical-support/${id}`, { method: 'DELETE' }),
  uploadTechnicalSupport: (data) => request('/master/technical-support/batch', { method: 'POST', body: JSON.stringify({ data }) }),

  getDistribusi: () => request('/master/distribusi'),
  createDistribusi: (body) => request('/master/distribusi', { method: 'POST', body: JSON.stringify(body) }),
  updateDistribusi: (id, body) => request(`/master/distribusi/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDistribusi: (id) => request(`/master/distribusi/${id}`, { method: 'DELETE' }),
  uploadDistribusi: (type, data) => request('/master/distribusi/batch', { method: 'POST', body: JSON.stringify({ type, data }) }),

  getActions: () => request('/master/actions'),
  createAction: (body) => request('/master/actions', { method: 'POST', body: JSON.stringify(body) }),
  updateAction: (id, body) => request(`/master/actions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAction: (id) => request(`/master/actions/${id}`, { method: 'DELETE' }),

  // Settings
  getEscalation: () => request('/settings/escalation'),
  updateEscalation: (body) => request('/settings/escalation', { method: 'PUT', body: JSON.stringify(body) }),
  testEscalation: () => request('/settings/escalation/test', { method: 'POST' }),
};


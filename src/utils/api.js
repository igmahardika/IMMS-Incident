const BASE = 'http://127.0.0.1:3001/api';

function getToken() {
  return localStorage.getItem('imms_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
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
  deleteIncidents: (body) => request('/incidents/batch', { method: 'DELETE', body: JSON.stringify(body) }),
  getNotifications: () => request('/incidents/notifications'),
  markNotificationRead: (id) => request(`/incidents/notifications/${id}/read`, { method: 'PUT' }),

  // Analytics
  getDashboard: () => request('/analytics/dashboard'),
  getDuration: (params = {}) => request(`/analytics/duration?${new URLSearchParams(params)}`),
  getSla: (params = {}) => request(`/analytics/sla?${new URLSearchParams(params)}`),
  getRootCause: (params = {}) => request(`/analytics/root-cause?${new URLSearchParams(params)}`),
  getTechPerf: (params = {}) => request(`/analytics/technician-perf?${new URLSearchParams(params)}`),

  // Master Data
  getCustomers: () => request('/master/customers'),
  createCustomer: (body) => request('/master/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) => request(`/master/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/master/customers/${id}`, { method: 'DELETE' }),
  uploadCustomers: (customers) => request('/master/customers/batch', { method: 'POST', body: JSON.stringify({ customers }) }),

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

  // Settings
  getEscalation: () => request('/settings/escalation'),
  updateEscalation: (body) => request('/settings/escalation', { method: 'PUT', body: JSON.stringify(body) }),
  testEscalation: () => request('/settings/escalation/test', { method: 'POST' }),
};

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function elapsedSeconds(startIso) {
  if (!startIso) return 0;
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
}

export const NCAL_ORDER = ['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

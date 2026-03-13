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
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function elapsedSeconds(startIso) {
  if (!startIso) return 0;
  return Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
}

export const NCAL_ORDER = ['BLACK', 'RED', 'ORANGE', 'YELLOW', 'BLUE'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Merges audit_logs and pause_logs into a single sorted timeline.
 * Calculates durations between steps where applicable.
 */
export function processTimeline(incident) {
  if (!incident) return [];

  const parseTime = (s) => {
    if (!s) return 0;
    // Normalize string: handle spaces and missing Z (assume UTC from server)
    let normalized = s;
    if (typeof s === 'string' && !s.includes('Z') && !s.includes('+')) {
      normalized = s.trim().replace(' ', 'T') + 'Z';
    }
    const t = new Date(normalized).getTime();
    return isNaN(t) ? 0 : t;
  };

  const audits = (incident.audit_logs || []).map(l => ({ ...l, type: 'audit', _time: parseTime(l.timestamp) }));
  const pauses = (incident.pause_logs || []).map(l => ({ ...l, type: 'pause', _time: parseTime(l.pause_start) }));
  
  // Unify PAUSE & RESUME entries
  pauses.forEach(p => {
    // Match PAUSE audit log
    const pauseMatch = audits.find(a => 
      !a._unified && a.action === 'PAUSE' && 
      (Math.abs(a._time - p._time) < 10000 || a.details === (p.reason || 'No reason given'))
    );
    if (pauseMatch) {
      p.user_name = pauseMatch.user_name;
      p.user_id = pauseMatch.user_id;
      pauseMatch._unified = true;
    }

    // Match RESUME audit log if pause is ended
    if (p.pause_end) {
      const eTime = parseTime(p.pause_end);
      const resumeMatch = audits.find(a => 
        !a._unified && a.action === 'RESUME' && 
        Math.abs(a._time - eTime) < 10000
      );
      if (resumeMatch) resumeMatch._unified = true;
    }
  });

  const filteredAudits = audits.filter(a => !a._unified);

  // Combine and sort by normalized timestamp
  const raw = [...filteredAudits, ...pauses].sort((a, b) => a._time - b._time);

  // Calculate segments
  const timeline = raw.map((item, idx) => {
    const current = item;
    const next = raw[idx+1];
    let duration = null;

    if (next) {
      duration = Math.floor((next._time - current._time) / 1000);
    } else if (incident.status !== 'done') {
      duration = Math.floor((Date.now() - current._time) / 1000);
    }

    return { ...item, segment_duration: duration };
  });

  return timeline;
}

/**
 * Calculates incident level based on gross duration (hourly buckets).
 * Level 1: 0-1h
 * Level 2: 1h1m - 2h
 * etc.
 */
export function calculateIncidentLevel(startTime, nowOrEndTime) {
  if (!startTime) return 1;
  const start = new Date(startTime).getTime();
  const end = nowOrEndTime ? new Date(nowOrEndTime).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 0) return 1;
  return Math.floor(seconds / 3600) + 1;
}

/**
 * Returns SLA target in seconds based on NCAL.
 */
export function getSLATarget(ncal) {
  switch (ncal) {
    case 'BLACK': return 2 * 3600;
    case 'RED':
    case 'ORANGE':
    case 'YELLOW': return 4 * 3600;
    case 'BLUE': return 6 * 3600;
    default: return 4 * 3600;
  }
}

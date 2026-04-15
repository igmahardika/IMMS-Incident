import assert from 'node:assert/strict';

import { getDashboardAnalytics, getDurationAnalytics, getRootCauseAnalytics, getSlaAnalytics, getTechnicianPerformanceAnalytics } from '../services/analytics/queries.js';
import { loginUser } from '../services/auth/auth.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/auth/tokens.js';
import { getActiveIncidents, getIncidentHistory, getIncidentNotifications, getRecurringIncidents } from '../services/incidents/queries.js';
import { listActions } from '../services/master/actions.js';
import { listClassifications } from '../services/master/classifications.js';
import { listCustomers } from '../services/master/customers.js';
import { listDistribusi } from '../services/master/distribusi.js';
import { listUsers } from '../services/master/users.js';
import { getEscalationConfig } from '../services/settings/escalation.js';

function assertArray(value, label) {
  assert.ok(Array.isArray(value), `${label} should return an array`);
}

function assertObject(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} should return an object`);
}

async function main() {
  const checks = [];

  const dashboard = getDashboardAnalytics();
  assertObject(dashboard, 'getDashboardAnalytics');
  assertArray(dashboard.activeByNcal, 'dashboard.activeByNcal');
  assertArray(dashboard.activeByStatus, 'dashboard.activeByStatus');
  assertArray(dashboard.monthlyTrend, 'dashboard.monthlyTrend');
  assertArray(dashboard.recentClosed, 'dashboard.recentClosed');
  checks.push(`dashboard:${dashboard.totalActive}/${dashboard.totalDone}`);

  assertArray(getDurationAnalytics(new Date().getFullYear()), 'getDurationAnalytics');
  assertArray(getSlaAnalytics({}), 'getSlaAnalytics');
  assertArray(getRootCauseAnalytics({}), 'getRootCauseAnalytics');
  assertArray(getTechnicianPerformanceAnalytics({}), 'getTechnicianPerformanceAnalytics');
  checks.push('analytics');

  assertArray(listCustomers(), 'listCustomers');
  assertArray(listClassifications(), 'listClassifications');
  assertArray(listUsers(), 'listUsers');
  assertArray(listDistribusi(), 'listDistribusi');
  assertArray(listActions(), 'listActions');
  checks.push('master');

  assertArray(getActiveIncidents({ role: 'admin', userId: 1 }), 'getActiveIncidents');
  const incidentHistory = getIncidentHistory({ limit: 10, offset: 0 });
  assertArray(incidentHistory, 'getIncidentHistory');
  assertArray(getIncidentNotifications({ role: 'admin', userId: 1 }), 'getIncidentNotifications');
  const sampleIncidentId = incidentHistory[0]?.id;
  if (sampleIncidentId) {
    const recurring = getRecurringIncidents(sampleIncidentId);
    assert.ok(recurring === null || typeof recurring === 'object', 'getRecurringIncidents should return null or an object payload');
  }
  checks.push('incidents');

  assertObject(getEscalationConfig(), 'getEscalationConfig');
  checks.push('settings');

  const payload = { id: 1, username: 'verify', role: 'admin', name: 'Verify User' };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  assert.equal(typeof accessToken, 'string', 'signAccessToken should return a token string');
  assert.equal(typeof refreshToken, 'string', 'signRefreshToken should return a token string');
  const decodedRefresh = verifyRefreshToken(refreshToken);
  assert.equal(decodedRefresh.username, payload.username, 'verifyRefreshToken should decode the signed payload');
  checks.push('tokens');

  let invalidLoginRejected = false;
  try {
    loginUser({ username: '__verify_invalid__', password: 'invalid' });
  } catch (error) {
    invalidLoginRejected = error?.status === 401;
  }
  assert.equal(invalidLoginRejected, true, 'loginUser should reject invalid credentials with status 401');
  checks.push('auth');

  console.log(`Backend service verification passed: ${checks.join(', ')}`);
}

main().catch((error) => {
  console.error('Backend service verification failed.');
  console.error(error);
  process.exitCode = 1;
});

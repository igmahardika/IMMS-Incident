import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { runtimeConfig } from '../config/runtime.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loginUser, refreshAccessToken } from '../services/auth/auth.js';
import {
  buildAuthPayload,
  signAccessToken,
  signRefreshToken,
} from '../services/auth/tokens.js';
import { createIncident } from '../services/incidents/write.js';
import {
  closeIncidentAction,
  pauseIncidentAction,
  resumeIncidentAction,
  startIncidentAction,
} from '../services/incidents/lifecycle.js';
import { getIncidentById } from '../services/incidents/queries.js';
import { importResolvedHistory } from '../services/incidents/importResolvedHistory.js';
import { incidentUpdateSchema } from '../utils/validators.js';

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function expectThrows(fn, predicate) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
    predicate(error);
  }
  assert.equal(threw, true, 'Expected function to throw');
}

async function expectRejects(fn, predicate) {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
    predicate(error);
  }
  assert.equal(threw, true, 'Expected function to reject');
}

function testAuthSessionFlow() {
  expectThrows(() => loginUser({ username: '', password: '' }), (error) => {
    assert.equal(error.status, 400);
  });

  expectThrows(() => loginUser({ username: '__verify_invalid__', password: 'nope' }), (error) => {
    assert.equal(error.status, 401);
  });

  const activeUser = db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
  assert.ok(activeUser, 'Expected at least one active user for token verification');
  const payload = buildAuthPayload(activeUser);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  assert.ok(accessToken, 'Access token should be generated');
  assert.ok(refreshToken, 'Refresh token should be generated');

  const refreshed = refreshAccessToken(refreshToken);
  assert.ok(refreshed.token, 'Refresh flow should return a new access token');

  expectThrows(() => refreshAccessToken(), (error) => {
    assert.equal(error.status, 401);
  });

  expectThrows(() => refreshAccessToken('invalid-token'), (error) => {
    assert.equal(error.status, 403);
  });
}

function testPermissionMiddleware() {
  const noTokenReq = { headers: {} };
  const noTokenRes = createMockResponse();
  let nextCalled = false;
  authenticate(noTokenReq, noTokenRes, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(noTokenRes.statusCode, 401);
  assert.equal(noTokenRes.payload.code, 'TOKEN_MISSING');

  const expiredToken = jwt.sign({ id: 1, role: 'admin', username: 'admin', name: 'Admin' }, runtimeConfig.JWT_SECRET, { expiresIn: -1 });
  const expiredReq = { headers: { authorization: `Bearer ${expiredToken}` } };
  const expiredRes = createMockResponse();
  authenticate(expiredReq, expiredRes, () => {});
  assert.equal(expiredRes.statusCode, 401);
  assert.equal(expiredRes.payload.code, 'TOKEN_EXPIRED');

  const allowedReq = { user: { role: 'noc' } };
  const allowedRes = createMockResponse();
  let allowedNext = false;
  authorize('admin', 'noc')(allowedReq, allowedRes, () => {
    allowedNext = true;
  });
  assert.equal(allowedNext, true);

  const deniedReq = { user: { role: 'technician' } };
  const deniedRes = createMockResponse();
  let deniedNext = false;
  authorize('admin', 'noc')(deniedReq, deniedRes, () => {
    deniedNext = true;
  });
  assert.equal(deniedNext, false);
  assert.equal(deniedRes.statusCode, 403);
}

function testIncidentLifecycleFlow() {
  const customer = db.prepare('SELECT id FROM master_customer WHERE is_active = 1 LIMIT 1').get();
  assert.ok(customer?.id, 'Expected at least one active customer');

  const createdIds = [];

  try {
    const { incident } = createIncident({
      case_no: `VERIFY-${Date.now()}`,
      customer_id: customer.id,
      ncal: 'YELLOW',
      level_support: '2',
      initial_problem: 'Verification lifecycle flow',
      start_time: new Date().toISOString(),
      technician_id: null,
    }, 1);

    createdIds.push(incident.id);
    assert.equal(incident.status, 'open');

    expectThrows(() => pauseIncidentAction(incident.id, 1, 'should fail before start'), (error) => {
      assert.equal(error.status, 400);
    });

    const started = startIncidentAction(incident.id, 1);
    assert.equal(started.status, 'progress');

    expectThrows(() => startIncidentAction(incident.id, 1), (error) => {
      assert.equal(error.status, 400);
    });

    const paused = pauseIncidentAction(incident.id, 1, 'Verification pause');
    assert.equal(paused.status, 'pending');

    const pausedAgain = pauseIncidentAction(incident.id, 1, 'Repeat pause');
    assert.equal(pausedAgain.already_paused, true);

    const resumed = resumeIncidentAction(incident.id, 1);
    assert.equal(resumed.status, 'progress');

    expectThrows(() => resumeIncidentAction(incident.id, 1), (error) => {
      assert.equal(error.status, 400);
    });

    const closed = closeIncidentAction(incident.id, 1, {
      root_cause: 'Verification complete',
      last_action: 'Closed by verification script',
      waktu_online: new Date(Date.now() + 1000).toISOString(),
    });
    assert.equal(closed.incident.status, 'done');

    const reloaded = getIncidentById(incident.id);
    assert.equal(reloaded.status, 'done');
    assert.ok(reloaded.duration_nett_seconds >= 0);
  } finally {
    if (createdIds.length) {
      const placeholders = createdIds.map(() => '?').join(', ');
      db.prepare(`DELETE FROM notifications WHERE incident_id IN (${placeholders})`).run(...createdIds);
      db.prepare(`DELETE FROM pause_logs WHERE incident_id IN (${placeholders})`).run(...createdIds);
      db.prepare(`DELETE FROM audit_logs WHERE incident_id IN (${placeholders})`).run(...createdIds);
      db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`).run(...createdIds);
    }
  }
}

function testUpdateSchemaGuards() {
  const parsed = incidentUpdateSchema.parse({
    last_action: 'safe update',
    status: 'done',
    technician_id: '12',
  });

  assert.equal(parsed.last_action, 'safe update');
  assert.equal(parsed.technician_id, 12);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'status'), false, 'Generic update schema must strip status changes');
}

async function testImportValidationFlow() {
  await expectRejects(
    () => importResolvedHistory({ filename: 'bad.xlsx', contentBase64: '' }),
    (error) => {
      assert.equal(error.status, 400);
      assert.match(error.message, /empty/i);
    }
  );
}

async function main() {
  testAuthSessionFlow();
  testPermissionMiddleware();
  testIncidentLifecycleFlow();
  testUpdateSchemaGuards();
  await testImportValidationFlow();

  console.log('Production flow verification passed: auth/session, permissions, incident lifecycle, update guards, import validation');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { incidentCreateSchema, incidentUpdateSchema, validateRequest } from '../utils/validators.js';
import { emitSocketEvent } from '../socket.js';
import logger from '../utils/logger.js';
import { deleteBatchIncidents } from '../services/incidents/deleteBatchIncidents.js';
import { importResolvedHistory } from '../services/incidents/importResolvedHistory.js';
import {
  closeIncidentAction,
  pauseIncidentAction,
  resumeIncidentAction,
  startIncidentAction,
} from '../services/incidents/lifecycle.js';
import {
  getActiveIncidents,
  getIncidentDetail,
  getIncidentHistory,
  getIncidentNotifications,
} from '../services/incidents/queries.js';
import { sendEscalation } from '../services/incidents/sendEscalation.js';
import {
  normalizeIncidentIds,
  runIncidentSideEffects,
} from '../services/incidents/utils.js';
import { createIncident, updateIncident } from '../services/incidents/write.js';
import { markNotificationRead } from '../services/incidents/notifications.js';
import { getRecurringIncidentSummary } from '../services/incidents/recurring.js';

const router = express.Router();

// ─── GET /api/incidents — active ────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  res.json(getActiveIncidents({ role: req.user.role, userId: req.user.id }));
});

// ─── GET /api/incidents/history ─────────────────────────────────────────────
router.get('/history', authenticate, (req, res) => {
  res.json(getIncidentHistory(req.query));
});

// ─── Notifications API ──────────────────────────────────────────────────────
router.get('/notifications', authenticate, (req, res) => {
  res.json(getIncidentNotifications({ role: req.user.role, userId: req.user.id }));
});

router.put('/notifications/:id/read', authenticate, (req, res) => {
  res.json(markNotificationRead(req.params.id));
});

// ─── GET /api/incidents/:id ─────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const row = getIncidentDetail(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// ─── POST /api/incidents — create ───────────────────────────────────────────
router.post('/', authenticate, validateRequest(incidentCreateSchema), (req, res) => {
  try {
    const incident = createIncident(req.body, req.user.id);

    emitSocketEvent('incident-updated', { type: 'create', incident });
    logger.info(`Incident created: Case #${incident.case_no} by User ID: ${req.user.id}`);

    sendEscalation(incident, 'open').catch((error) => {
      logger.error(`Escalation webhook failed for opened incident ${incident.case_no}: ${error.message}`);
    });

    res.status(201).json(incident);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Nomor Case sudah digunakan!' });
    }
    console.error('CRITICAL INCIDENT CREATE ERROR:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// ─── PUT /api/incidents/:id — update fields ─────────────────────────────────
router.put('/:id', authenticate, validateRequest(incidentUpdateSchema), (req, res) => {
  try {
    const { incident, old } = updateIncident(req.params.id, req.body, req.user);
    emitSocketEvent('incident-updated', { type: 'update', id: req.params.id });
    logger.info(`Incident updated: Case #${old.case_no} by User ID: ${req.user.id}`);
    res.json(incident);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error(`Failed to update incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to update incident.' });
  }
});

// ─── POST /api/incidents/:id/start ──────────────────────────────────────────
router.post('/:id/start', authenticate, (req, res) => {
  try {
    const updated = startIncidentAction(req.params.id, req.user.id);
    res.json(updated);

    runIncidentSideEffects(() => {
      emitSocketEvent('incident-updated', { type: 'status_change', id: req.params.id });
      logger.info(`Action started for Case ID: ${req.params.id} by User ID: ${req.user.id}`);
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error(`Failed to start incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to start incident action.' });
  }
});

// ─── POST /api/incidents/:id/pause ──────────────────────────────────────────
router.post('/:id/pause', authenticate, (req, res) => {
  try {
    const { reason } = req.body || {};
    const updated = pauseIncidentAction(req.params.id, req.user.id, reason);
    res.json(updated);

    runIncidentSideEffects(() => {
      emitSocketEvent('incident-updated', { type: 'status_change', id: req.params.id });
      logger.info(`Incident paused: Case ID: ${req.params.id} by User ID: ${req.user.id}. Reason: ${reason || 'N/A'}`);
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error(`Failed to pause incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to pause incident.' });
  }
});

// ─── POST /api/incidents/:id/resume ─────────────────────────────────────────
router.post('/:id/resume', authenticate, (req, res) => {
  try {
    const updated = resumeIncidentAction(req.params.id, req.user.id);
    res.json(updated);

    runIncidentSideEffects(() => {
      emitSocketEvent('incident-updated', { type: 'status_change', id: req.params.id });
      logger.info(`Incident resumed: Case ID: ${req.params.id} by User ID: ${req.user.id}`);
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error(`Failed to resume incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to resume incident.' });
  }
});

// ─── POST /api/incidents/:id/close ──────────────────────────────────────────
router.post('/:id/close', authenticate, (req, res) => {
  try {
    const { incident: updated, grossSec, nettSec } = closeIncidentAction(req.params.id, req.user.id, req.body || {});
    res.json(updated);

    runIncidentSideEffects(() => {
      sendEscalation(updated, 'close').catch((error) => {
        logger.error(`Escalation webhook failed for closed incident ${updated.case_no}: ${error.message}`);
      });
      emitSocketEvent('incident-updated', { type: 'close', id: req.params.id });
      logger.info(`Incident closed: Case #${updated.case_no} by User ID: ${req.user.id}`);
      logger.info(`Incident close metrics: id=${req.params.id} gross=${grossSec}s nett=${nettSec}s`);
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    logger.error(`Failed to close incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to close incident.' });
  }
});

// ─── GET /api/incidents/:id/recurring ───────────────────────────────────────
router.get('/:id/recurring', authenticate, (req, res) => {
  const recurring = getRecurringIncidentSummary(req.params.id);
  if (!recurring) return res.status(404).json({ error: 'Not found' });
  res.json(recurring);
});

// ─── DELETE /api/incidents/batch ──────────────────────────────────────────
router.delete('/batch', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can delete incidents.' });
  }

  const incidentIds = normalizeIncidentIds(req.body?.ids);
  if (!incidentIds.length) {
    return res.status(400).json({ error: 'No IDs provided' });
  }

  try {
    const result = deleteBatchIncidents(incidentIds);
    logger.info(
      `Batch delete incidents: requested=${incidentIds.length} deleted=${result.deleted} `
      + `legacyCustomers=${result.deletedLegacyCustomers || 0} legacyUsers=${result.deletedLegacyUsers || 0} `
      + `by user=${req.user.id}`
    );
    res.json({
      success: true,
      deleted: result.deleted,
      deletedLegacyCustomers: result.deletedLegacyCustomers || 0,
      deletedLegacyUsers: result.deletedLegacyUsers || 0,
    });
  } catch (err) {
    logger.error(`Batch delete error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to delete incidents' });
  }
});

// ─── POST /api/incidents/import-history ───────────────────────────────────
router.post('/import-history', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can import resolved history.' });
  }

  const filename = String(req.body?.filename || '').trim();
  const contentBase64 = String(req.body?.contentBase64 || '').trim();

  if (!filename || !contentBase64) {
    return res.status(400).json({ error: 'File payload is incomplete.' });
  }

  if (!/\.xlsx$/i.test(filename)) {
    return res.status(400).json({ error: 'Only .xlsx files are supported.' });
  }

  try {
    const report = await importResolvedHistory({ filename, contentBase64 });
    logger.info(
      `[History Import] file=${filename} inserted=${report.inserted_incidents} skipped_existing=${report.skipped_existing_case_count}`
    );
    res.json({ success: true, report });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to import resolved history workbook.' });
  }
});


export default router;

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getEscalationConfig,
  sendEscalationTest,
  upsertEscalationConfig,
} from '../services/settings/escalation.js';
import { handleAsyncRoute, handleRoute } from '../utils/http.js';

const router = express.Router();

router.get('/escalation', authenticate, (req, res) => {
  res.json(getEscalationConfig());
});

router.put('/escalation', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => upsertEscalationConfig(req.body), {
    fallbackMessage: 'Settings request failed.',
  });
});

router.post('/escalation/test', authenticate, authorize('admin', 'manager'), async (req, res) => {
  return handleAsyncRoute(res, () => sendEscalationTest(), {
    fallbackMessage: 'Settings request failed.',
  });
});

export default router;

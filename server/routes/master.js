import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleAsyncRoute, handleRoute } from '../utils/http.js';
import logger from '../utils/logger.js';
import {
  batchUpsertCustomers,
  createCustomer,
  deactivateCustomer,
  listCustomers,
  updateCustomer,
} from '../services/master/customers.js';
import {
  createClassification,
  deactivateClassification,
  listClassifications,
  updateClassification,
} from '../services/master/classifications.js';
import {
  autoGeocodeCustomers,
  autoGeocodeDistribusi,
  getCustomerGeocodeReport,
  getDistribusiGeocodeReport,
  listCustomersMissingCoords,
  listDistribusiMissingCoords,
} from '../services/master/geocode.js';
import {
  batchCreateDistribusi,
  createDistribusi,
  deactivateDistribusi,
  listDistribusi,
  updateDistribusi,
} from '../services/master/distribusi.js';
import { createAction, listActions, updateAction } from '../services/master/actions.js';
import {
  createUser,
  deactivateUser,
  listTechnicalSupportCompatibility,
  listUsers,
  updateUser,
} from '../services/master/users.js';

const router = express.Router();

// ── MASTER CUSTOMER ─────────────────────────────────────────────────────────────
router.get('/customers', authenticate, (req, res) => {
  res.json(listCustomers());
});
router.post('/customers', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => createCustomer(req.body), {
    status: 201,
    uniqueMessage: 'Customer ID atau Service ID sudah digunakan',
    fallbackMessage: 'Master data request failed.',
  });
});
router.post('/customers/batch', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { customers } = req.body;
  if (!customers || !Array.isArray(customers)) return res.status(400).json({ error: 'Invalid data' });

  return handleRoute(res, () => {
    const count = batchUpsertCustomers(customers);
    return { success: true, count };
  }, { fallbackMessage: 'Master data request failed.' });
});
router.put('/customers/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => updateCustomer(req.params.id, req.body), {
    uniqueMessage: 'Customer ID atau Service ID sudah digunakan',
    fallbackMessage: 'Master data request failed.',
  });
});
router.delete('/customers/:id', authenticate, authorize('admin'), (req, res) => {
  res.json(deactivateCustomer(req.params.id));
});

// ── MASTER CLASSIFICATIONS ───────────────────────────────────────────────────────────
router.get('/classifications', authenticate, (req, res) => {
  res.json(listClassifications());
});
router.post('/classifications', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => createClassification(req.body), {
    status: 201,
    fallbackMessage: 'Master data request failed.',
  });
});
router.put('/classifications/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => updateClassification(req.params.id, req.body), {
    fallbackMessage: 'Master data request failed.',
  });
});
router.delete('/classifications/:id', authenticate, authorize('admin'), (req, res) => {
  res.json(deactivateClassification(req.params.id));
});

// ── USERS ─────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('admin', 'manager', 'noc'), (req, res) => {
  res.json(listUsers());
});
router.post('/users', authenticate, authorize('admin'), (req, res) => {
  return handleRoute(res, () => createUser(req.body), {
    status: 201,
    uniqueMessage: 'Username is already in use.',
    fallbackMessage: 'Master data request failed.',
  });
});
router.put('/users/:id', authenticate, authorize('admin'), (req, res) => {
  return handleRoute(res, () => updateUser(req.params.id, req.body, req.user.id), {
    fallbackMessage: 'Master data request failed.',
  });
});
router.delete('/users/:id', authenticate, authorize('admin'), (req, res) => {
  return handleRoute(res, () => deactivateUser(req.params.id, req.user.id), {
    fallbackMessage: 'Master data request failed.',
  });
});

// ── LEGACY TECHNICAL SUPPORT COMPATIBILITY ───────────────────────────────────
router.get('/technical-support', authenticate, authorize('admin', 'manager', 'noc'), (req, res) => {
  res.json(listTechnicalSupportCompatibility());
});

function deprecatedTechnicalSupportResponse(res) {
  return res.status(410).json({
    error: 'Technical support registry has been merged into /master/users.',
  });
}

router.post('/technical-support', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.post('/technical-support/batch', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.put('/technical-support/:id', authenticate, authorize('admin', 'manager'), (_req, res) => deprecatedTechnicalSupportResponse(res));
router.delete('/technical-support/:id', authenticate, authorize('admin'), (_req, res) => deprecatedTechnicalSupportResponse(res));

// ── MASTER DISTRIBUSI ───────────────────────────────────────────────────────
router.get('/distribusi', authenticate, (req, res) => {
  res.json(listDistribusi());
});

router.post('/distribusi', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => createDistribusi(req.body), {
    status: 201,
    fallbackMessage: 'Master data request failed.',
  });
});

router.post('/distribusi/batch', authenticate, authorize('admin', 'manager'), (req, res) => {
  const { type, data } = req.body; // type: 'Fiber Optic' or 'Wireless'
  if (!data || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid data' });

  return handleRoute(res, () => {
    const count = batchCreateDistribusi(type, data);
    return { success: true, count };
  }, { fallbackMessage: 'Master data request failed.' });
});

router.put('/distribusi/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => updateDistribusi(req.params.id, req.body), {
    fallbackMessage: 'Master data request failed.',
  });
});

router.delete('/distribusi/:id', authenticate, authorize('admin'), (req, res) => {
  res.json(deactivateDistribusi(req.params.id));
});

// ── MASTER ACTIONS (HANDLING) ────────────────────────────────────────────────
router.get('/actions', authenticate, (req, res) => {
  res.json(listActions());
});

router.post('/actions', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => createAction(req.body), {
    status: 201,
    fallbackMessage: 'Master data request failed.',
  });
});

router.put('/actions/:id', authenticate, authorize('admin', 'manager'), (req, res) => {
  return handleRoute(res, () => updateAction(req.params.id, req.body), {
    fallbackMessage: 'Master data request failed.',
  });
});

// ── AUTO-GEOCODING CUSTOMERS ──────────────────────────────────────────────────
router.get('/customers/missing-coords', authenticate, (req, res) => {
  res.json(listCustomersMissingCoords());
});

router.get('/customers/geocode-report', authenticate, (req, res) => {
  res.json(getCustomerGeocodeReport());
});

router.post('/customers/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  return handleAsyncRoute(res, () => autoGeocodeCustomers(req.body?.ids), {
    fallbackMessage: 'Customer geocoding failed.',
    onSuccess: (result) => {
      logger.info(
        `[Geocode][Customers] requested=${result.requested} updated=${result.updated} geocoded=${result.geocoded} `
        + `cached=${result.cached} failed=${result.failed} skipped=${result.skipped} remaining=${result.remaining}`
      );
    },
  });
});

// ── AUTO-GEOCODING DISTRIBUSI ──────────────────────────────────────────────────
router.get('/distribusi/missing-coords', authenticate, (req, res) => {
  res.json(listDistribusiMissingCoords());
});

router.get('/distribusi/geocode-report', authenticate, (req, res) => {
  res.json(getDistribusiGeocodeReport());
});

router.post('/distribusi/auto-geocode', authenticate, authorize('admin', 'manager'), async (req, res) => {
  return handleAsyncRoute(res, () => autoGeocodeDistribusi(req.body?.ids), {
    fallbackMessage: 'Distribution geocoding failed.',
    onSuccess: (result) => {
      logger.info(
        `[Geocode][Distribusi] requested=${result.requested} updated=${result.updated} derived=${result.derived} `
        + `geocoded=${result.geocoded} cached=${result.cached} failed=${result.failed} skipped=${result.skipped} remaining=${result.remaining}`
      );
    },
  });
});

export default router;

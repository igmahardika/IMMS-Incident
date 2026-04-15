import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getDashboardAnalytics,
  getDistributionTroubleAnalytics,
  getDurationAnalytics,
  getRootCauseAnalytics,
  getSlaAnalytics,
  getTechnicianPerformanceAnalytics,
  getTroubleMapAnalytics,
} from '../services/analytics/queries.js';

const router = express.Router();

// ─── Duration averages by NCAL per month ─────────────────────────────────────
router.get('/duration', authenticate, (req, res) => {
  res.json(getDurationAnalytics(req.query.year));
});

// ─── SLA summary ─────────────────────────────────────────────────────────────
router.get('/sla', authenticate, (req, res) => {
  res.json(getSlaAnalytics(req.query));
});

// ─── Root Cause breakdown ─────────────────────────────────────────────────────
router.get('/root-cause', authenticate, (req, res) => {
  res.json(getRootCauseAnalytics(req.query));
});

// ─── Dashboard KPI ─────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, (req, res) => {
  res.json(getDashboardAnalytics());
});

// ─── Technician performance ───────────────────────────────────────────────────
router.get('/technician-perf', authenticate, (req, res) => {
  res.json(getTechnicianPerformanceAnalytics(req.query));
});

// ─── Trouble Map Data ────────────────────────────────────────────────────────
router.get('/trouble-map', authenticate, (req, res) => {
  res.json(getTroubleMapAnalytics({
    startDate: req.query.start_date,
    endDate: req.query.end_date,
  }));
});

// ─── Distribution Trouble Spots ───────────────────────────────────────────────
router.get('/distribution-trouble', authenticate, (req, res) => {
  res.json(getDistributionTroubleAnalytics({
    startDate: req.query.start_date,
    endDate: req.query.end_date,
  }));
});

export default router;

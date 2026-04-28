import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { initSocket } from './socket.js';
import logger from './utils/logger.js';
dotenv.config();
import './db.js'; // initialize DB and seed
import { runtimeConfig, runtimeWarnings } from './config/runtime.js';
import authRoutes from './routes/auth.js';
import incidentRoutes from './routes/incidents.js';
import analyticsRoutes from './routes/analytics.js';
import masterRoutes from './routes/master.js';
import settingsRoutes from './routes/settings.js';
import { getLivenessStatus, getReadinessStatus } from './services/ops/readiness.js';

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);
const PORT = runtimeConfig.PORT;

if (runtimeConfig.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

for (const warning of runtimeWarnings) {
  logger.warn(`[Runtime] ${warning}`);
}

const allowedOrigins = new Set(runtimeConfig.ALLOWED_ORIGINS_LIST);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: runtimeConfig.BODY_LIMIT }));
app.use(express.urlencoded({ limit: runtimeConfig.BODY_LIMIT, extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health/live', (_req, res) => res.json(getLivenessStatus()));
app.get('/api/health/ready', (_req, res) => {
  const status = getReadinessStatus();
  res.status(status.status === 'ready' ? 200 : 503).json(status);
});
app.get('/api/health', (_req, res) => {
  const status = getReadinessStatus();
  res.status(status.status === 'ready' ? 200 : 503).json(status);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  void next;
  logger.error(`[HTTP] ${req.method} ${req.originalUrl} failed: ${error.message}`);
  res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
});

httpServer.keepAliveTimeout = runtimeConfig.KEEP_ALIVE_TIMEOUT_MS;
httpServer.requestTimeout = runtimeConfig.REQUEST_TIMEOUT_MS;

let shuttingDown = false;

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.warn(`[Runtime] Received ${signal}, shutting down Nexaris API...`);
  httpServer.close((error) => {
    if (error) {
      logger.error(`[Runtime] Graceful shutdown failed: ${error.message}`);
      process.exit(1);
    }
    logger.info('[Runtime] HTTP server closed cleanly.');
    process.exit(exitCode);
  });
  setTimeout(() => {
    logger.error('[Runtime] Force exiting after shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('unhandledRejection', (reason) => {
  logger.error(`[Runtime] Unhandled promise rejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`[Runtime] Uncaught exception: ${error.stack || error.message}`);
  shutdown('uncaughtException', 1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Nexaris API running on http://localhost:${PORT} (env=${runtimeConfig.NODE_ENV})`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { initSocket } from './socket.js';
import logger from './utils/logger.js';
dotenv.config();
import './db.js'; // initialize DB and seed
import authRoutes from './routes/auth.js';
import incidentRoutes from './routes/incidents.js';
import analyticsRoutes from './routes/analytics.js';
import masterRoutes from './routes/master.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 IMMS API running on http://localhost:${PORT}`);
});

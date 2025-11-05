import express from 'express';
import dotenv from 'dotenv';
import promClient from 'prom-client';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { AddressInfo } from 'net';
import { logger } from '../shared/utils/logger';
import { errorHandler } from '../shared/middleware/errorHandler';
import { startCollectors } from './collectors/serviceCollector';

dotenv.config();

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' }));

// Prometheus metrics setup
const register = promClient.register;
promClient.collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'monitoring-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start background collectors
startCollectors().catch((err) => {
  logger.error('Failed to start collectors', { error: (err as Error).message });
});

// Start server with dynamic port fallback if PORT not provided
const requestedPort = process.env.PORT ? Number(process.env.PORT) : 0;
const server = app.listen(requestedPort, () => {
  const address = server.address() as AddressInfo;
  const actualPort = address.port;
  // Surface chosen port for operators and orchestrators
  logger.info('Monitoring service running', { port: actualPort });
});

export default app;


import promClient from 'prom-client';
import detect from 'detect-port';
import dotenv from 'dotenv';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import {
  trustScoreGauge,
  averageTrustScoreGauge,
  serviceHealthGauge
} from './metrics/TrustMetrics';

dotenv.config();

const app = express();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'monitoring-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ]
});

promClient.collectDefaultMetrics();

// seed a couple of gauges for visibility
trustScoreGauge.labels('0x0000...dev', 'monitoring').set(75.2);
averageTrustScoreGauge.labels('monitoring').set(68.1);
serviceHealthGauge.labels('monitoring').set(1);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

async function start() {
  const desired = Number(process.env.PORT) || 0;
  const port = desired || (await detect(9100));
  app.listen(port, () => {
    logger.info(`Monitoring service listening on port ${port}`);
  });
}

// Only start if run directly
if (require.main === module) {
  start();
}

export { app, start };


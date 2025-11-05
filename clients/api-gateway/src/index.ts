import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import promClient from 'prom-client';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger';
import { errorHandler } from '../shared/middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import { authMiddleware } from './middleware/auth';
import { cacheMiddleware } from './middleware/cache';
import { tracingMiddleware, exportTraceEndpoint } from './middleware/tracing';
import { createCircuitBreakerMiddleware, circuitBreakerRegistry } from './middleware/circuitBreaker';
import { GraphQLServer } from './graphql/server';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Prometheus metrics
const register = promClient.register;
promClient.collectDefaultMetrics();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZippyCoin API Gateway',
      version: '1.0.0',
      description: 'Unified API Gateway for ZippyCoin Ecosystem',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Distributed tracing
app.use(tracingMiddleware);

// Circuit breakers for each service
Object.keys(services).forEach(serviceName => {
  app.use(`/api/v1/${serviceName}`, createCircuitBreakerMiddleware(serviceName));
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      trust: 'http://localhost:3000',
      wallet: 'http://localhost:3001',
      node: 'http://localhost:3002',
      defi: 'http://localhost:3003',
      governance: 'http://localhost:3004',
      bridge: 'http://localhost:3005',
      nft: 'http://localhost:3006'
    }
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Trace export endpoint
app.get('/api/v1/tracing/export', exportTraceEndpoint);

// Circuit breaker status endpoint
app.get('/api/v1/circuit-breakers', (req, res) => {
  const states = circuitBreakerRegistry.getAllStates();
  res.json({
    circuitBreakers: states,
    timestamp: new Date().toISOString(),
  });
});

// Circuit breaker reset endpoint
app.post('/api/v1/circuit-breakers/reset/:service', (req, res) => {
  const { service } = req.params;
  circuitBreakerRegistry.resetService(service);
  res.json({
    message: `Circuit breaker for ${service} reset`,
    timestamp: new Date().toISOString(),
  });
});

// Service routing with proxy
const services = {
  trust: 'http://localhost:3000',
  wallet: 'http://localhost:3001',
  node: 'http://localhost:3002',
  defi: 'http://localhost:3003',
  governance: 'http://localhost:3004',
  bridge: 'http://localhost:3005',
  nft: 'http://localhost:3006'
};

// Proxy middleware for each service
Object.entries(services).forEach(([service, target]) => {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/v1/${service}`]: `/api/v1/${service}`,
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.info(`${req.method} ${req.path} -> ${service}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${service}:`, err);
      res.status(502).json({ error: `Service ${service} unavailable` });
    },
  });

  app.use(`/api/v1/${service}`, metricsMiddleware, authMiddleware, cacheMiddleware, proxy);
});

// Unified API endpoints
app.get('/api/v1/status', async (req, res) => {
  try {
    const statusPromises = Object.entries(services).map(async ([service, url]) => {
      try {
        const response = await fetch(`${url}/health`);
        const data = await response.json();
        return { service, status: data.status, timestamp: data.timestamp };
      } catch (error) {
        return { service, status: 'unavailable', error: error.message };
      }
    });

    const statuses = await Promise.all(statusPromises);
    res.json({ services: statuses });
  } catch (error) {
    logger.error('Error checking service status:', error);
    res.status(500).json({ error: 'Failed to check service status' });
  }
});

// Trust-weighted API endpoints
app.get('/api/v1/trust/ecosystem', async (req, res) => {
  try {
    // Aggregate trust data from services (best-effort)
    const endpoints = {
      trust: `${services.trust}/health`,
      node: `${services.node}/status`,
      defi: `${services.defi}/health`,
      governance: `${services.governance}/health`,
      bridge: `${services.bridge}/health`,
      nft: `${services.nft}/health`
    } as const;

    const results = await Promise.allSettled(
      Object.entries(endpoints).map(async ([name, url]) => {
        const resp = await fetch(url);
        const data = await resp.json();
        return { name, data };
      })
    );

    const summary: Record<string, any> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        summary[r.value.name] = r.value.data;
      } else {
        summary[(r as any).reason?.name || 'unknown'] = { status: 'unavailable' };
      }
    }

    res.json({ services: summary });
  } catch (error) {
    logger.error('Error getting ecosystem trust data:', error);
    res.status(500).json({ error: 'Failed to get ecosystem data' });
  }
});

// Consolidated node/network summary (pulls from node service or direct RPC)
app.get('/api/v1/network/summary', async (req, res) => {
  try {
    const nodeServiceBase = services.node;
    const nodeRpcBase = process.env.NODE_RPC_BASE || `http://localhost:${process.env.ZIPPYCOIN_RPC_PORT || '8545'}`;

    const endpoints = ['status', 'genesis', 'consensus', 'trust', 'environment'] as const;

    const fetchFirstAvailable = async (path: string) => {
      const urls = [
        `${nodeServiceBase}/${path}`,
        `${nodeRpcBase}/${path}`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (r.ok) return await r.json();
        } catch (_) {
          // try next
        }
      }
      return { error: 'unavailable' };
    };

    const results = Object.fromEntries(
      await Promise.all(
        endpoints.map(async (ep) => [ep, await fetchFirstAvailable(ep)])
      )
    );

    // Include environmental data from node service if available
    let envHash: any = { error: 'unavailable' };
    let envExtended: any = { error: 'unavailable' };
    try {
      const hashPromise = fetch(`${services.node}/api/v1/environment/hash`);
      const extendedPromise = fetch(`${services.node}/api/v1/environment/extended`);
      
      const [hashResponse, extendedResponse] = await Promise.allSettled([hashPromise, extendedPromise]);
      
      if (hashResponse.status === 'fulfilled' && hashResponse.value.ok) {
        envHash = await hashResponse.value.json();
      }
      
      if (extendedResponse.status === 'fulfilled' && extendedResponse.value.ok) {
        envExtended = await extendedResponse.value.json();
      }
    } catch {}

    res.json({
      timestamp: new Date().toISOString(),
      node: results.status,
      genesis: results.genesis,
      consensus: results.consensus,
      trust: results.trust,
      environment: results.environment,
      environmentHash: envHash,
      environmentExtended: envExtended,
    });
  } catch (error: any) {
    logger.error('Error building network summary:', error);
    res.status(500).json({ error: 'Failed to build network summary' });
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize GraphQL server
const graphQLServer = new GraphQLServer(app, services);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
  logger.info(`GraphQL playground available at http://localhost:${PORT}/graphql`);
  logger.info(`WebSocket subscriptions available at ws://localhost:${PORT}/subscriptions`);
  logger.info(`Distributed tracing available at http://localhost:${PORT}/api/v1/tracing/export`);
  logger.info(`Circuit breaker status available at http://localhost:${PORT}/api/v1/circuit-breakers`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    graphQLServer.stop();
    logger.info('API Gateway closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    graphQLServer.stop();
    logger.info('API Gateway closed');
  });
});

export default app; 
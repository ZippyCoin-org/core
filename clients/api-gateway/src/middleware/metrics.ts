import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'api_gateway_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms for API Gateway',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = (req.route && (req.route.path || req.route)) || req.path || 'unknown';
    httpRequestDuration.labels(req.method, String(route), String(res.statusCode)).observe(duration);
  });
  next();
};

export default metricsMiddleware;



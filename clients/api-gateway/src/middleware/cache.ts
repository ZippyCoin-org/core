import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

const defaultTtlMs = parseInt(process.env.API_GATEWAY_CACHE_TTL_MS || '30000', 10);
const inMemoryCache = new Map<string, CacheEntry>();

const cacheKeyFrom = (req: Request): string => {
  const url = req.originalUrl || req.url;
  const auth = req.headers['authorization'] || '';
  return `${req.method}:${url}:${auth}`;
};

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const key = cacheKeyFrom(req);
  const now = Date.now();
  const cached = inMemoryCache.get(key);

  if (cached && cached.expiresAt > now) {
    res.setHeader('X-Cache', 'HIT');
    res.json(cached.value);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    try {
      inMemoryCache.set(key, { value: body, expiresAt: now + defaultTtlMs });
      res.setHeader('X-Cache', 'MISS');
    } catch (_) {
      // best-effort cache, ignore errors
    }
    return originalJson(body);
  } as any;

  next();
};

export default cacheMiddleware;



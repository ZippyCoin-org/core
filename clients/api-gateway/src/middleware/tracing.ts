import { logger } from '../shared/utils/logger';

interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  logs: TraceLog[];
}

interface TraceLog {
  timestamp: number;
  fields: Record<string, any>;
}

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage?: Record<string, string>;
}

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private activeSpans: Set<string> = new Set();

  constructor(private serviceName: string) {}

  // Start a new span
  startSpan(name: string, parentContext?: TraceContext, tags: Record<string, string> = {}): { span: TraceSpan; context: TraceContext } {
    const spanId = this.generateSpanId();
    const traceId = parentContext?.traceId || this.generateTraceId();

    const span: TraceSpan = {
      id: spanId,
      parentId: parentContext?.spanId,
      name,
      startTime: Date.now(),
      tags: { ...tags, service: this.serviceName },
      logs: [],
    };

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      sampled: parentContext?.sampled ?? true,
      baggage: parentContext?.baggage,
    };

    this.spans.set(spanId, span);
    this.activeSpans.add(spanId);

    logger.debug(`Started span ${spanId} for ${name} in trace ${traceId}`);
    return { span, context };
  }

  // Finish a span
  finishSpan(spanId: string, logs: TraceLog[] = []) {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn(`Attempted to finish non-existent span ${spanId}`);
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.logs.push(...logs);

    this.activeSpans.delete(spanId);

    logger.debug(`Finished span ${spanId} in ${span.duration}ms`);
  }

  // Add log to span
  log(spanId: string, fields: Record<string, any>) {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn(`Attempted to log to non-existent span ${spanId}`);
      return;
    }

    span.logs.push({
      timestamp: Date.now(),
      fields,
    });
  }

  // Set tag on span
  setTag(spanId: string, key: string, value: string) {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn(`Attempted to set tag on non-existent span ${spanId}`);
      return;
    }

    span.tags[key] = value;
  }

  // Get span by ID
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  // Get all spans for a trace
  getTrace(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter(span => {
      // This is a simplified implementation - in reality you'd need to track trace IDs
      return true; // For now, return all spans
    });
  }

  // Export trace data
  exportTrace(traceId: string): any {
    const spans = this.getTrace(traceId);
    return {
      traceId,
      spans: spans.map(span => ({
        id: span.id,
        parentId: span.parentId,
        name: span.name,
        startTime: span.startTime,
        endTime: span.endTime,
        duration: span.duration,
        tags: span.tags,
        logs: span.logs,
      })),
    };
  }

  // Clean up completed spans (for memory management)
  cleanup(maxAge: number = 300000) { // 5 minutes default
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [spanId, span] of this.spans) {
      if (span.endTime && (now - span.endTime) > maxAge) {
        toRemove.push(spanId);
      }
    }

    for (const spanId of toRemove) {
      this.spans.delete(spanId);
      this.activeSpans.delete(spanId);
    }

    if (toRemove.length > 0) {
      logger.debug(`Cleaned up ${toRemove.length} completed spans`);
    }
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Global tracer instance
export const tracer = new Tracer('api-gateway');

// Tracing middleware for Express
export function tracingMiddleware(req: any, res: any, next: any) {
  const spanName = `${req.method} ${req.path}`;
  const { span, context } = tracer.startSpan(spanName, undefined, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Add trace context to request
  req.traceContext = context;
  req.traceSpanId = span.id;

  // Add trace headers to response
  res.set('X-Trace-Id', context.traceId);
  res.set('X-Span-Id', context.spanId);

  // Log request start
  tracer.log(span.id, {
    event: 'request_start',
    url: req.url,
    headers: req.headers,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    tracer.log(span.id, {
      event: 'response_end',
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
    });

    tracer.finishSpan(span.id, [{
      timestamp: Date.now(),
      fields: {
        event: 'span_finished',
        duration: Date.now() - span.startTime,
      },
    }]);

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

// Utility function to create child spans
export function createChildSpan(parentContext: TraceContext, name: string, tags: Record<string, string> = {}) {
  return tracer.startSpan(name, parentContext, tags);
}

// Export trace data endpoint
export function exportTraceEndpoint(req: any, res: any) {
  const traceId = req.query.traceId as string;
  if (!traceId) {
    return res.status(400).json({ error: 'traceId parameter required' });
  }

  try {
    const traceData = tracer.exportTrace(traceId);
    res.json(traceData);
  } catch (error) {
    logger.error('Error exporting trace:', error);
    res.status(500).json({ error: 'Failed to export trace' });
  }
}

// Periodic cleanup
setInterval(() => {
  tracer.cleanup();
}, 60000); // Clean up every minute


import { logger } from '../shared/utils/logger';

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  successThreshold: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'CLOSED',
    failureCount: 0,
    lastFailureTime: 0,
    successCount: 0,
  };

  private config: CircuitBreakerConfig;

  constructor(
    private serviceName: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 3,
      ...config,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state.state = 'HALF_OPEN';
        this.state.successCount = 0;
        logger.info(`Circuit breaker for ${this.serviceName} moved to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker for ${this.serviceName} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.failureCount = 0;

    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++;
      if (this.state.successCount >= this.config.successThreshold) {
        this.state.state = 'CLOSED';
        logger.info(`Circuit breaker for ${this.serviceName} moved to CLOSED`);
      }
    }
  }

  private onFailure() {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'HALF_OPEN') {
      this.state.state = 'OPEN';
      logger.warn(`Circuit breaker for ${this.serviceName} moved to OPEN after failure in HALF_OPEN`);
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'OPEN';
      logger.warn(`Circuit breaker for ${this.serviceName} moved to OPEN (failures: ${this.state.failureCount})`);
    }
  }

  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.state.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset() {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    };
    logger.info(`Circuit breaker for ${this.serviceName} manually reset`);
  }
}

// Circuit breaker middleware factory
export function createCircuitBreakerMiddleware(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
) {
  const breaker = new CircuitBreaker(serviceName, config);

  return async (req: any, res: any, next: any) => {
    try {
      // Add circuit breaker to request for use in route handlers
      req.circuitBreaker = breaker;

      // Check circuit breaker state
      if (breaker.getState().state === 'OPEN') {
        logger.warn(`Circuit breaker OPEN for ${serviceName}, rejecting request`);
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          circuitBreaker: 'OPEN'
        });
      }

      next();
    } catch (error) {
      logger.error(`Circuit breaker middleware error for ${serviceName}:`, error);
      next(error);
    }
  };
}

// Circuit breaker registry for multiple services
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }

  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }
    return states;
  }

  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  resetService(serviceName: string) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();


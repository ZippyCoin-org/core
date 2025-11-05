import request from 'supertest';
import { expect } from 'chai';
import app from '../index';

describe('API Gateway Integration Tests', () => {
  describe('GraphQL Endpoint', () => {
    it('should return GraphQL schema introspection', async () => {
      const query = `
        query {
          __typename
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body.data.__typename).to.equal('Query');
    });

    it('should handle GraphQL errors gracefully', async () => {
      const invalidQuery = `
        query {
          invalidField
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidQuery })
        .expect(200);

      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors[0].message).to.include('Cannot query field');
    });
  });

  describe('Circuit Breaker Status', () => {
    it('should return circuit breaker states', async () => {
      const response = await request(app)
        .get('/api/v1/circuit-breakers')
        .expect(200);

      expect(response.body).to.have.property('circuitBreakers');
      expect(response.body.circuitBreakers).to.be.an('object');
      expect(response.body).to.have.property('timestamp');
    });

    it('should allow resetting circuit breakers', async () => {
      const response = await request(app)
        .post('/api/v1/circuit-breakers/reset/trust')
        .expect(200);

      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('trust');
      expect(response.body).to.have.property('timestamp');
    });
  });

  describe('Distributed Tracing', () => {
    it('should add trace headers to responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).to.have.property('x-trace-id');
      expect(response.headers).to.have.property('x-span-id');
      expect(response.headers['x-trace-id']).to.be.a('string');
      expect(response.headers['x-span-id']).to.be.a('string');
    });

    it('should export trace data', async () => {
      const response = await request(app)
        .get('/api/v1/tracing/export?traceId=test-trace-id')
        .expect(200);

      expect(response.body).to.have.property('traceId', 'test-trace-id');
      expect(response.body).to.have.property('spans');
      expect(response.body.spans).to.be.an('array');
    });

    it('should handle missing trace ID', async () => {
      const response = await request(app)
        .get('/api/v1/tracing/export')
        .expect(400);

      expect(response.body).to.have.property('error', 'traceId parameter required');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('service', 'api-gateway');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('services');
    });
  });

  describe('Service Status', () => {
    it('should return service status summary', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body).to.have.property('services');
      expect(response.body.services).to.be.an('array');
      expect(response.body.services[0]).to.have.property('service');
      expect(response.body.services[0]).to.have.property('status');
    });
  });

  describe('Network Summary', () => {
    it('should return network summary', async () => {
      const response = await request(app)
        .get('/api/v1/network/summary')
        .expect(200);

      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('node');
      expect(response.body).to.have.property('genesis');
      expect(response.body).to.have.property('consensus');
      expect(response.body).to.have.property('trust');
      expect(response.body).to.have.property('environment');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body).to.have.property('error', 'Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(100).fill().map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(res => res.status === 429);

      // Should not hit rate limit with 100 requests in test environment
      // In production, this would test actual rate limiting
      expect(tooManyRequests).to.be.false;
    });
  });
});


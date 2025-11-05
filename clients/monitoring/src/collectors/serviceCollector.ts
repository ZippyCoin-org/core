import axios from 'axios';
import promClient from 'prom-client';
import { logger } from '../../shared/utils/logger';
import { serviceHealthGauge, serviceResponseTimeHistogram } from '../metrics/TrustMetrics';

type ServiceKey = 'trust' | 'wallet' | 'node' | 'defi' | 'governance' | 'bridge' | 'nft' | 'api-gateway';

const DEFAULT_SERVICES: Record<ServiceKey, string> = {
  trust: process.env.SVC_TRUST || 'http://localhost:3000',
  wallet: process.env.SVC_WALLET || 'http://localhost:3001',
  node: process.env.SVC_NODE || 'http://localhost:3002',
  defi: process.env.SVC_DEFI || 'http://localhost:3003',
  governance: process.env.SVC_GOVERNANCE || 'http://localhost:3004',
  bridge: process.env.SVC_BRIDGE || 'http://localhost:3005',
  nft: process.env.SVC_NFT || 'http://localhost:3006',
  'api-gateway': process.env.SVC_APIGW || 'http://localhost:3007',
};

const register = promClient.register;

export async function startCollectors(): Promise<void> {
  const intervalMs = Number(process.env.COLLECT_INTERVAL_MS || '15000');

  const collectOnce = async () => {
    const entries = Object.entries(DEFAULT_SERVICES) as [ServiceKey, string][];
    await Promise.all(entries.map(async ([name, base]) => {
      const endpoint = name === 'api-gateway' ? `${base}/api/v1/status` : `${base}/health`;
      const start = process.hrtime.bigint();
      try {
        const resp = await axios.get(endpoint, { timeout: 5000 });
        const durationSec = Number((process.hrtime.bigint() - start)) / 1e9;
        serviceHealthGauge.set({ service_name: name }, 1);
        serviceResponseTimeHistogram.observe({ service_name: name, endpoint }, durationSec);
        logger.info('Collected service health', { service: name, status: resp.status });
      } catch (error: any) {
        const durationSec = Number((process.hrtime.bigint() - start)) / 1e9;
        serviceHealthGauge.set({ service_name: name }, 0);
        serviceResponseTimeHistogram.observe({ service_name: name, endpoint }, durationSec);
        logger.warn('Service health check failed', { service: name, error: error.message });
      }
    }));
  };

  // Run immediately, then on interval
  await collectOnce();
  setInterval(collectOnce, intervalMs).unref();

  logger.info('Monitoring collectors started', { intervalMs });
}



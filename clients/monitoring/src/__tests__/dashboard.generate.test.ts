import fs from 'fs';
import path from 'path';
import { buildDashboard } from '../dashboards/generate';

describe('Grafana dashboard generator', () => {
  it('builds a dashboard object with expected panels and templating', () => {
    const dashboard = buildDashboard();
    expect(dashboard).toBeTruthy();
    expect(Array.isArray(dashboard.panels)).toBe(true);
    const titles = dashboard.panels.map((p: any) => p.title);
    const required = [
      'Trust Score (avg)',
      'Ecosystem Trust Score',
      'DeFi Position Value',
      'Trust Multiplier',
      'Yield Rewards Total',
      'Governance Proposals Active',
      'Trust-weighted Votes',
      'Bridge Volume',
      'Bridge Transfers (rate)',
      'NFT Mints (rate)',
      'Wallet Creations (rate)',
      'Transactions (rate)',
      'Service Health',
      'Service Response p95',
      'Environmental Data',
      'Errors (rate)'
    ];
    for (const t of required) {
      expect(titles).toContain(t);
    }

    const templating = dashboard.templating?.list || [];
    const names = templating.map((v: any) => v.name);
    expect(names).toContain('service');
    expect(names).toContain('environment');
  });

  it('writes the dashboard file to disk', () => {
    const outDir = path.resolve(__dirname, '../../dashboards');
    const outFile = path.join(outDir, 'zippycoin.dashboard.json');
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    // dynamic import to run the side-effect write
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../dashboards/generate');
    expect(fs.existsSync(outFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    expect(content.title).toBe('ZippyCoin Overview');
  });
});


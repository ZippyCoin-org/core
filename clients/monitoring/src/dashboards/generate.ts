import fs from 'fs';
import path from 'path';

type Panel = Record<string, any>;

const promPanel = (title: string, expr: string, panelId: number, format: 'time_series' | 'stat' = 'time_series'): Panel => ({
  id: panelId,
  title,
  type: format === 'stat' ? 'stat' : 'timeseries',
  datasource: { type: 'prometheus', uid: '${DS_PROMETHEUS}' },
  fieldConfig: { defaults: { unit: 'short' }, overrides: [] },
  options: {},
  targets: [{ expr, legendFormat: '{{service}}', refId: 'A' }],
  gridPos: { h: 8, w: 12, x: (panelId % 2) * 12, y: Math.floor(panelId / 2) * 8 }
});

const buildDashboard = () => {
  const panels: Panel[] = [
    promPanel('Trust Score (avg)', 'avg(zippycoin_trust_score)', 1),
    promPanel('Ecosystem Trust Score', 'zippycoin_ecosystem_trust_score', 2),
    promPanel('DeFi Position Value', 'sum(zippycoin_defi_position_value)', 3),
    promPanel('Trust Multiplier', 'avg(zippycoin_trust_multiplier)', 4),
    promPanel('Yield Rewards Total', 'sum(increase(zippycoin_yield_rewards_total[5m]))', 5),
    promPanel('Governance Proposals Active', 'sum(zippycoin_governance_proposals_active)', 6),
    promPanel('Trust-weighted Votes', 'sum(zippycoin_trust_weighted_votes)', 7),
    promPanel('Bridge Volume', 'sum(zippycoin_bridge_volume)', 8),
    promPanel('Bridge Transfers (rate)', 'sum(rate(zippycoin_bridge_transfers_total[5m]))', 9),
    promPanel('NFT Mints (rate)', 'sum(rate(zippycoin_nft_mints_total[5m]))', 10),
    promPanel('Wallet Creations (rate)', 'sum(rate(zippycoin_wallet_creations_total[5m]))', 11),
    promPanel('Transactions (rate)', 'sum(rate(zippycoin_transactions_total[5m]))', 12),
    promPanel('Service Health', 'avg(zippycoin_service_health)', 13),
    promPanel('Service Response p95', 'histogram_quantile(0.95, sum(rate(zippycoin_service_response_time_bucket[5m])) by (le))', 14),
    promPanel('Environmental Data', 'sum(zippycoin_environmental_data)', 15),
    promPanel('Errors (rate)', 'sum(rate(zippycoin_errors_total[5m]))', 16)
  ];

  return {
    annotations: { list: [] },
    editable: true,
    graphTooltip: 1,
    id: null,
    links: [],
    liveNow: false,
    panels,
    refresh: '10s',
    schemaVersion: 38,
    style: 'dark',
    tags: ['zippycoin'],
    templating: {
      list: [
        {
          name: 'service',
          label: 'Service',
          type: 'query',
          datasource: { type: 'prometheus', uid: '${DS_PROMETHEUS}' },
          query: 'label_values(zippycoin_service_health, service_name)',
          includeAll: true,
          allValue: '.*',
          refresh: 2,
          regex: ''
        },
        {
          name: 'environment',
          label: 'Environment',
          type: 'custom',
          query: 'prod,staging,dev',
          current: { selected: true, text: 'dev', value: 'dev' }
        }
      ]
    },
    time: { from: 'now-6h', to: 'now' },
    timepicker: {},
    timezone: '',
    title: 'ZippyCoin Overview',
    uid: 'zippycoin-overview',
    version: 1
  };
};

const outDir = path.resolve(__dirname, '../../dashboards');
const outFile = path.join(outDir, 'zippycoin.dashboard.json');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const dashboard = buildDashboard();
fs.writeFileSync(outFile, JSON.stringify(dashboard, null, 2));
console.log(`Dashboard written to ${outFile}`);

export { buildDashboard };


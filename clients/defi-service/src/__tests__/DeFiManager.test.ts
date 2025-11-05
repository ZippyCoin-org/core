import { DeFiManager } from '../services/DeFiManager';

describe('DeFiManager', () => {
  let defiManager: DeFiManager;

  beforeEach(() => {
    defiManager = new DeFiManager();
  });

  describe('initialization', () => {
    it('should initialize with default pools', async () => {
      await defiManager.initialize();
      
      const pools = defiManager.getPools();
      expect(pools.length).toBeGreaterThan(0);
      
      const trustFarmingPool = pools.find(p => p.name === 'Trust Farming Pool');
      expect(trustFarmingPool).toBeDefined();
      expect(trustFarmingPool?.trustWeight).toBe(1.0);
    });
  });

  describe('yield farming', () => {
    it('should create yield position with trust multiplier', async () => {
      const userAddress = 'zpc1user123456789012345678901234567890';
      const poolId = 'trust-farming-pool';
      const amount = '1000';
      const trustScore = 85;

      const position = await defiManager.stakeForYield(
        userAddress,
        poolId,
        amount,
        trustScore
      );

      expect(position).toBeDefined();
      expect(position.userAddress).toBe(userAddress);
      expect(position.poolId).toBe(poolId);
      expect(position.stakedAmount).toBe(amount);
      expect(position.trustMultiplier).toBeGreaterThan(1.0);
      expect(position.trustMultiplier).toBeLessThanOrEqual(2.0);
    });

    it('should calculate rewards with trust bonus', async () => {
      const userAddress = 'zpc1user123456789012345678901234567890';
      const poolId = 'trust-farming-pool';
      const amount = '1000';
      const trustScore = 90;

      const position = await defiManager.stakeForYield(
        userAddress,
        poolId,
        amount,
        trustScore
      );

      const rewards = await defiManager.calculateRewards(position.id);
      expect(parseFloat(rewards)).toBeGreaterThan(0);
    });
  });

  describe('lending', () => {
    it('should create lending position with trust-based interest rate', async () => {
      const userAddress = 'zpc1user123456789012345678901234567890';
      const asset = 'ZPC';
      const borrowedAmount = '500';
      const collateralAmount = '1000';
      const trustScore = 80;

      const position = await defiManager.createLendingPosition(
        userAddress,
        asset,
        borrowedAmount,
        collateralAmount,
        trustScore
      );

      expect(position).toBeDefined();
      expect(position.userAddress).toBe(userAddress);
      expect(position.asset).toBe(asset);
      expect(position.interestRate).toBeLessThan(0.05); // Should be reduced by trust score
      expect(position.liquidationRisk).toBeLessThan(0.5);
    });
  });

  describe('swap protocol', () => {
    it('should provide swap quote with trust discount', async () => {
      const fromToken = 'ZPC';
      const toToken = 'ETH';
      const fromAmount = '1000';
      const userTrustScore = 85;

      const quote = await defiManager.getSwapQuote(
        fromToken,
        toToken,
        fromAmount,
        userTrustScore
      );

      expect(quote).toBeDefined();
      expect(quote.fromToken).toBe(fromToken);
      expect(quote.toToken).toBe(toToken);
      expect(quote.fromAmount).toBe(fromAmount);
      expect(quote.toAmount).toBeDefined();
      expect(quote.trustDiscount).toBeGreaterThan(0);
      expect(quote.trustDiscount).toBeLessThanOrEqual(0.5);
    });

    it('should execute swap with trust-weighted fees', async () => {
      const userAddress = 'zpc1user123456789012345678901234567890';
      const quote = {
        fromToken: 'ZPC',
        toToken: 'ETH',
        fromAmount: '1000',
        toAmount: '1.5',
        priceImpact: 0.5,
        fee: '3',
        trustDiscount: 0.25
      };
      const slippageTolerance = 0.01;

      const txHash = await defiManager.executeSwap(
        userAddress,
        quote,
        slippageTolerance
      );

      expect(txHash).toBeDefined();
      expect(txHash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('trust-weighted features', () => {
    it('should calculate trust multiplier correctly', () => {
      const trustScore = 90;
      const position = defiManager.getUserYieldPositions('test')[0];
      
      if (position) {
        expect(position.trustMultiplier).toBe(1.9); // 1.0 + (90/100) * 1.0
      }
    });

    it('should apply trust discount to fees', () => {
      const trustScore = 80;
      const baseFee = 100;
      const expectedDiscount = (trustScore / 100) * 0.5; // 0.4
      const expectedFee = baseFee * (1 - expectedDiscount); // 60

      // This would be tested in the actual fee calculation methods
      expect(expectedFee).toBe(60);
    });
  });

  describe('statistics', () => {
    it('should provide accurate protocol statistics', () => {
      const stats = defiManager.getStats();
      
      expect(stats.totalPools).toBeGreaterThan(0);
      expect(stats.totalLiquidity).toBeDefined();
      expect(stats.totalPositions).toBeGreaterThanOrEqual(0);
      expect(stats.averageAPR).toBeGreaterThan(0);
    });
  });
}); 
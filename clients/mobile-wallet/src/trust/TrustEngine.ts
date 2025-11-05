export class TrustEngine {
  private trustScores: Map<string, number> = new Map();
  private delegations: Map<string, string[]> = new Map();

  async calculateTrustScore(address: string): Promise<number> {
    // Return cached score or default
    return this.trustScores.get(address) || 50;
  }

  async updateTrustScore(address: string, score: number): Promise<void> {
    // Validate score range
    if (score < 0 || score > 100) {
      throw new Error('Trust score must be between 0 and 100');
    }

    this.trustScores.set(address, score);
  }

  async validateDelegation(delegatorAddress: string, delegateAddress: string): Promise<boolean> {
    const delegatorScore = await this.calculateTrustScore(delegatorAddress);
    const delegateScore = await this.calculateTrustScore(delegateAddress);

    // Only allow delegation if delegator has high trust score
    if (delegatorScore < 80) {
      return false;
    }

    // Prevent circular delegation
    const existingDelegations = this.delegations.get(delegateAddress) || [];
    if (existingDelegations.includes(delegatorAddress)) {
      return false;
    }

    // Add delegation
    const delegatorDelegations = this.delegations.get(delegatorAddress) || [];
    delegatorDelegations.push(delegateAddress);
    this.delegations.set(delegatorAddress, delegatorDelegations);

    return true;
  }

  async getDelegations(address: string): Promise<string[]> {
    return this.delegations.get(address) || [];
  }

  async removeDelegation(delegatorAddress: string, delegateAddress: string): Promise<boolean> {
    const delegations = this.delegations.get(delegatorAddress) || [];
    const index = delegations.indexOf(delegateAddress);
    
    if (index > -1) {
      delegations.splice(index, 1);
      this.delegations.set(delegatorAddress, delegations);
      return true;
    }

    return false;
  }

  async calculateDelegatedTrust(address: string): Promise<number> {
    const baseScore = await this.calculateTrustScore(address);
    const delegations = await this.getDelegations(address);
    
    if (delegations.length === 0) {
      return baseScore;
    }

    // Calculate weighted average of delegated trust
    let totalWeight = 1; // Base weight
    let weightedSum = baseScore;

    for (const delegate of delegations) {
      const delegateScore = await this.calculateTrustScore(delegate);
      const weight = 0.5; // Delegation weight
      
      totalWeight += weight;
      weightedSum += delegateScore * weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  async getTrustHistory(address: string): Promise<Array<{score: number, timestamp: number}>> {
    // Mock trust history for testing
    const currentScore = await this.calculateTrustScore(address);
    return [
      { score: currentScore - 5, timestamp: Date.now() - 86400000 }, // 1 day ago
      { score: currentScore, timestamp: Date.now() }
    ];
  }

  async validateTrustScore(score: number): Promise<boolean> {
    return score >= 0 && score <= 100;
  }
} 
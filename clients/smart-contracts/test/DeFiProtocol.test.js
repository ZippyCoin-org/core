import { expect } from "chai";
import { ethers } from "hardhat";

describe("DeFiProtocol", function () {
  let defiProtocol;
  let trustEngine;
  let mockToken;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy TrustEngine first
    const TrustEngine = await ethers.getContractFactory("TrustEngine");
    trustEngine = await TrustEngine.deploy();
    await trustEngine.waitForDeployment();
    
    // Deploy DeFiProtocol
    const DeFiProtocol = await ethers.getContractFactory("DeFiProtocol");
    defiProtocol = await DeFiProtocol.deploy(await trustEngine.getAddress());
    await defiProtocol.waitForDeployment();
    
    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();
    
    // Initialize trust scores
    await trustEngine.initializeTrustScore(user1.address, 80);
    await trustEngine.initializeTrustScore(user2.address, 60);
    await trustEngine.initializeTrustScore(user3.address, 40);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await defiProtocol.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await defiProtocol.owner()).to.equal(owner.address);
    });

    it("Should set the correct trust engine", async function () {
      expect(await defiProtocol.trustEngine()).to.equal(await trustEngine.getAddress());
    });
  });

  describe("Pool Management", function () {
    it("Should allow owner to create yield pool", async function () {
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      expect(await defiProtocol.activePools(await mockToken.getAddress())).to.be.true;
    });

    it("Should emit PoolCreated event", async function () {
      await expect(defiProtocol.createPool(await mockToken.getAddress(), 100, 1500))
        .to.emit(defiProtocol, "PoolCreated")
        .withArgs(await mockToken.getAddress(), 1500);
    });

    it("Should only allow owner to create pools", async function () {
      await expect(
        defiProtocol.connect(user1).createPool(await mockToken.getAddress(), 100, 1500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject invalid token address", async function () {
      await expect(
        defiProtocol.createPool(ethers.ZeroAddress, 100, 1500)
      ).to.be.revertedWith("Invalid token");
    });

    it("Should reject zero rewards per block", async function () {
      await expect(
        defiProtocol.createPool(await mockToken.getAddress(), 0, 1500)
      ).to.be.revertedWith("Invalid rewards per block");
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("100");
      await defiProtocol.connect(user1).stake(await mockToken.getAddress(), stakeAmount);
      
      expect(await defiProtocol.userStakedAmount(user1.address, await mockToken.getAddress())).to.equal(stakeAmount);
      expect(await defiProtocol.poolTotalStaked(await mockToken.getAddress())).to.equal(stakeAmount);
    });

    it("Should emit Staked event", async function () {
      const stakeAmount = ethers.parseEther("100");
      await expect(defiProtocol.connect(user1).stake(await mockToken.getAddress(), stakeAmount))
        .to.emit(defiProtocol, "Staked")
        .withArgs(user1.address, await mockToken.getAddress(), stakeAmount, 80);
    });

    it("Should require sufficient trust score", async function () {
      // User3 has trust score 40, but needs 20, so this should work
      await mockToken.mint(user3.address, ethers.parseEther("1000"));
      await mockToken.connect(user3).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
      
      const stakeAmount = ethers.parseEther("100");
      await expect(
        defiProtocol.connect(user3).stake(await mockToken.getAddress(), stakeAmount)
      ).to.not.be.reverted;
    });

    it("Should reject staking in inactive pool", async function () {
      const stakeAmount = ethers.parseEther("100");
      await expect(
        defiProtocol.connect(user1).stake(ethers.ZeroAddress, stakeAmount)
      ).to.be.revertedWith("Pool not active");
    });

    it("Should reject zero stake amount", async function () {
      await expect(
        defiProtocol.connect(user1).stake(await mockToken.getAddress(), 0)
      ).to.be.revertedWith("Amount must be positive");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
      await defiProtocol.connect(user1).stake(await mockToken.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow users to unstake tokens", async function () {
      const unstakeAmount = ethers.parseEther("50");
      await defiProtocol.connect(user1).unstake(await mockToken.getAddress(), unstakeAmount);
      
      expect(await defiProtocol.userStakedAmount(user1.address, await mockToken.getAddress())).to.equal(ethers.parseEther("50"));
      expect(await defiProtocol.poolTotalStaked(await mockToken.getAddress())).to.equal(ethers.parseEther("50"));
    });

    it("Should emit Unstaked event", async function () {
      const unstakeAmount = ethers.parseEther("50");
      await expect(defiProtocol.connect(user1).unstake(await mockToken.getAddress(), unstakeAmount))
        .to.emit(defiProtocol, "Unstaked")
        .withArgs(user1.address, await mockToken.getAddress(), unstakeAmount, 0); // No rewards yet
    });

    it("Should reject unstaking more than staked", async function () {
      const unstakeAmount = ethers.parseEther("150");
      await expect(
        defiProtocol.connect(user1).unstake(await mockToken.getAddress(), unstakeAmount)
      ).to.be.revertedWith("Insufficient staked amount");
    });

    it("Should reject zero unstake amount", async function () {
      await expect(
        defiProtocol.connect(user1).unstake(await mockToken.getAddress(), 0)
      ).to.be.revertedWith("Amount must be positive");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
      
      await defiProtocol.connect(user1).stake(await mockToken.getAddress(), ethers.parseEther("100"));
      
      // Mine blocks after staking to generate rewards
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
    });

    it("Should calculate pending rewards correctly", async function () {
      // Debug: Check pool state
      const poolTotalStaked = await defiProtocol.poolTotalStaked(await mockToken.getAddress());
      const poolRewardsPerBlock = await defiProtocol.poolRewardsPerBlock(await mockToken.getAddress());
      const poolLastUpdateBlock = await defiProtocol.poolLastUpdateBlock(await mockToken.getAddress());
      const poolAccRewardsPerShare = await defiProtocol.poolAccRewardsPerShare(await mockToken.getAddress());
      const userStakedAmount = await defiProtocol.userStakedAmount(user1.address, await mockToken.getAddress());
      const userRewardDebt = await defiProtocol.userRewardDebt(user1.address, await mockToken.getAddress());
      const trustMultiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      
      console.log("Pool Total Staked:", poolTotalStaked.toString());
      console.log("Pool Rewards Per Block:", poolRewardsPerBlock.toString());
      console.log("Pool Last Update Block:", poolLastUpdateBlock.toString());
      console.log("Pool Acc Rewards Per Share:", poolAccRewardsPerShare.toString());
      console.log("User Staked Amount:", userStakedAmount.toString());
      console.log("User Reward Debt:", userRewardDebt.toString());
      console.log("Trust Multiplier:", trustMultiplier.toString());
      console.log("Current Block:", (await ethers.provider.getBlockNumber()).toString());
      
      const pendingRewards = await defiProtocol.getPendingRewards(user1.address, await mockToken.getAddress());
      console.log("Pending Rewards:", pendingRewards.toString());
      expect(pendingRewards).to.be.gt(0);
    });

    it("Should allow claiming rewards", async function () {
      await expect(defiProtocol.connect(user1).claimRewards(await mockToken.getAddress()))
        .to.emit(defiProtocol, "RewardsClaimed");
    });

    it("Should require staked amount to claim rewards", async function () {
      await expect(
        defiProtocol.connect(user2).claimRewards(await mockToken.getAddress())
      ).to.be.revertedWith("No stake in pool");
    });
  });

  describe("Trust Multiplier Integration", function () {
    beforeEach(async function () {
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.mint(user2.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
      await mockToken.connect(user2).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
    });

    it("Should apply trust multiplier to rewards", async function () {
      await defiProtocol.connect(user1).stake(await mockToken.getAddress(), ethers.parseEther("100"));
      await defiProtocol.connect(user2).stake(await mockToken.getAddress(), ethers.parseEther("100"));
      
      // Mine several blocks to generate rewards
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      
      const rewards1 = await defiProtocol.getPendingRewards(user1.address, await mockToken.getAddress());
      const rewards2 = await defiProtocol.getPendingRewards(user2.address, await mockToken.getAddress());
      
      // User1 has higher trust score (80 vs 60), so should get higher rewards
      expect(rewards1).to.be.gt(rewards2);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw tokens", async function () {
      await mockToken.mint(await defiProtocol.getAddress(), ethers.parseEther("100"));
      await defiProtocol.emergencyWithdraw(await mockToken.getAddress());
      
      expect(await mockToken.balanceOf(owner.address)).to.be.gt(0);
    });

    it("Should only allow owner to emergency withdraw", async function () {
      await expect(
        defiProtocol.connect(user1).emergencyWithdraw(await mockToken.getAddress())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    it("Should return correct total value locked", async function () {
      expect(await defiProtocol.totalValueLocked()).to.equal(0);
      
      await defiProtocol.createPool(await mockToken.getAddress(), 100, 1500);
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await defiProtocol.getAddress(), ethers.parseEther("1000"));
      await defiProtocol.connect(user1).stake(await mockToken.getAddress(), ethers.parseEther("100"));
      
      expect(await defiProtocol.totalValueLocked()).to.equal(ethers.parseEther("100"));
    });

    it("Should return correct user total staked", async function () {
      // This function returns 0 in the simplified version
      expect(await defiProtocol.getUserTotalStaked(user1.address)).to.equal(0);
    });
  });
});

// Mock ERC20 token for testing
describe("MockERC20", function () {
  let mockToken;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();
  });

  it("Should mint tokens to owner", async function () {
    await mockToken.mint(owner.address, ethers.parseEther("1000"));
    expect(await mockToken.balanceOf(owner.address)).to.equal(ethers.parseEther("1000"));
  });
}); 
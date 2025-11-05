import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZippyTrustContract", function () {
  let zippyTrust;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy ZippyTrustContract
    const ZippyTrustContract = await ethers.getContractFactory("ZippyTrustContract");
    zippyTrust = await ZippyTrustContract.deploy();
    await zippyTrust.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await zippyTrust.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await zippyTrust.owner()).to.equal(owner.address);
    });
  });

  describe("Trust Score Management", function () {
    it("Should allow owner to set trust scores", async function () {
      const scoreData = {
        transactionSuccess: 95,
        validatorUptime: 98,
        stakingReliability: 92,
        networkParticipation: 88,
        governanceVoting: 85,
        socialReputation: 90,
        communityVoting: 87,
        liquidityProvision: 93,
        collateralStaking: 89,
        crossChainActivity: 91
      };

      await zippyTrust.setTrustScore(user1.address, scoreData);

      const trustScore = await zippyTrust.getTrustScore(user1.address);
      expect(trustScore.isActive).to.be.true;
      expect(trustScore.transactionSuccess).to.equal(95);
      expect(trustScore.validatorUptime).to.equal(98);
    });

    it("Should only allow owner to set trust scores", async function () {
      const scoreData = {
        transactionSuccess: 95,
        validatorUptime: 98,
        stakingReliability: 92,
        networkParticipation: 88,
        governanceVoting: 85,
        socialReputation: 90,
        communityVoting: 87,
        liquidityProvision: 93,
        collateralStaking: 89,
        crossChainActivity: 91
      };

      await expect(
        zippyTrust.connect(user1).setTrustScore(user2.address, scoreData)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should calculate overall trust score correctly", async function () {
      const scoreData = {
        transactionSuccess: 100,
        validatorUptime: 100,
        stakingReliability: 100,
        networkParticipation: 100,
        governanceVoting: 100,
        socialReputation: 100,
        communityVoting: 100,
        liquidityProvision: 100,
        collateralStaking: 100,
        crossChainActivity: 100
      };

      await zippyTrust.setTrustScore(user1.address, scoreData);

      const overallScore = await zippyTrust.calculateOverallTrustScore(user1.address);
      expect(overallScore).to.equal(100); // Perfect score
    });

    it("Should return zero for non-existent trust scores", async function () {
      const overallScore = await zippyTrust.calculateOverallTrustScore(user1.address);
      expect(overallScore).to.equal(0);
    });
  });

  describe("Custom Trust Fields", function () {
    it("Should allow owner to create custom trust fields", async function () {
      const fieldData = {
        name: "Environmental Impact",
        dataType: 0, // numeric
        weight: 20,
        dataSource: 1, // off_chain
        updateFrequency: 2, // daily
        isActive: true
      };

      await expect(zippyTrust.createTrustField(fieldData))
        .to.emit(zippyTrust, "TrustFieldCreated");

      const field = await zippyTrust.getTrustField(1);
      expect(field.name).to.equal("Environmental Impact");
      expect(field.weight).to.equal(20);
      expect(field.isActive).to.be.true;
    });

    it("Should only allow owner to create trust fields", async function () {
      const fieldData = {
        name: "Test Field",
        dataType: 0,
        weight: 10,
        dataSource: 0,
        updateFrequency: 0,
        isActive: true
      };

      await expect(
        zippyTrust.connect(user1).createTrustField(fieldData)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow setting custom field values", async function () {
      // Create field first
      const fieldData = {
        name: "Custom Metric",
        dataType: 0,
        weight: 15,
        dataSource: 0,
        updateFrequency: 0,
        isActive: true
      };

      await zippyTrust.createTrustField(fieldData);

      // Set field value
      await zippyTrust.setTrustFieldValue(user1.address, "Custom Metric", 85);

      const fieldValue = await zippyTrust.getTrustFieldValue(user1.address, "Custom Metric");
      expect(fieldValue).to.equal(85);
    });

    it("Should reject setting values for non-existent fields", async function () {
      await expect(
        zippyTrust.setTrustFieldValue(user1.address, "NonExistentField", 50)
      ).to.be.revertedWith("Trust field does not exist");
    });
  });

  describe("Trust Delegation", function () {
    beforeEach(async function () {
      // Set up trust scores for delegation testing
      const scoreData = {
        transactionSuccess: 80,
        validatorUptime: 85,
        stakingReliability: 75,
        networkParticipation: 70,
        governanceVoting: 90,
        socialReputation: 88,
        communityVoting: 82,
        liquidityProvision: 78,
        collateralStaking: 85,
        crossChainActivity: 80
      };

      await zippyTrust.setTrustScore(user1.address, scoreData);
      await zippyTrust.setTrustScore(user2.address, scoreData);
    });

    it("Should allow users to delegate trust", async function () {
      const delegationAmount = 25;

      await expect(zippyTrust.connect(user1).delegateTrust(user2.address, delegationAmount))
        .to.emit(zippyTrust, "TrustDelegated");

      const delegations = await zippyTrust.getTrustDelegations(user1.address);
      expect(delegations.length).to.equal(1);
      expect(delegations[0].delegate).to.equal(user2.address);
      expect(delegations[0].amount).to.equal(delegationAmount);
    });

    it("Should reject delegation exceeding available trust", async function () {
      const delegationAmount = 150; // More than available trust

      await expect(
        zippyTrust.connect(user1).delegateTrust(user2.address, delegationAmount)
      ).to.be.revertedWith("Insufficient trust to delegate");
    });

    it("Should allow revoking trust delegations", async function () {
      // Delegate first
      await zippyTrust.connect(user1).delegateTrust(user2.address, 20);

      // Revoke delegation
      await expect(zippyTrust.connect(user1).revokeTrustDelegation(user2.address))
        .to.emit(zippyTrust, "TrustDelegationRevoked");

      const delegations = await zippyTrust.getTrustDelegations(user1.address);
      expect(delegations.length).to.equal(0);
    });

    it("Should calculate effective trust score including delegations", async function () {
      // Set up a third user with lower trust
      const lowScoreData = {
        transactionSuccess: 50,
        validatorUptime: 50,
        stakingReliability: 50,
        networkParticipation: 50,
        governanceVoting: 50,
        socialReputation: 50,
        communityVoting: 50,
        liquidityProvision: 50,
        collateralStaking: 50,
        crossChainActivity: 50
      };

      await zippyTrust.setTrustScore(user3.address, lowScoreData);

      // User1 delegates to user3
      await zippyTrust.connect(user1).delegateTrust(user3.address, 30);

      const effectiveScore = await zippyTrust.getEffectiveTrustScore(user3.address);
      expect(effectiveScore).to.be.gt(50); // Should be boosted by delegation
    });
  });

  describe("Trust Analytics", function () {
    beforeEach(async function () {
      // Set up multiple users with different trust scores
      const scores = [
        {
          transactionSuccess: 90, validatorUptime: 95, stakingReliability: 88,
          networkParticipation: 85, governanceVoting: 92, socialReputation: 87,
          communityVoting: 89, liquidityProvision: 91, collateralStaking: 86,
          crossChainActivity: 88
        },
        {
          transactionSuccess: 75, validatorUptime: 80, stakingReliability: 78,
          networkParticipation: 72, governanceVoting: 85, socialReputation: 79,
          communityVoting: 81, liquidityProvision: 76, collateralStaking: 83,
          crossChainActivity: 77
        },
        {
          transactionSuccess: 60, validatorUptime: 65, stakingReliability: 58,
          networkParticipation: 62, governanceVoting: 55, socialReputation: 68,
          communityVoting: 61, liquidityProvision: 59, collateralStaking: 64,
          crossChainActivity: 63
        }
      ];

      await zippyTrust.setTrustScore(user1.address, scores[0]);
      await zippyTrust.setTrustScore(user2.address, scores[1]);
      await zippyTrust.setTrustScore(user3.address, scores[2]);
    });

    it("Should calculate trust distribution correctly", async function () {
      const distribution = await zippyTrust.getTrustDistribution();
      expect(distribution.highTrust).to.be.gt(0);
      expect(distribution.mediumTrust).to.be.gt(0);
      expect(distribution.lowTrust).to.be.gt(0);
    });

    it("Should return trust statistics", async function () {
      const stats = await zippyTrust.getTrustStatistics();
      expect(stats.averageTrustScore).to.be.gt(0);
      expect(stats.totalUsers).to.equal(3);
      expect(stats.highestTrustScore).to.be.gt(stats.lowestTrustScore);
    });

    it("Should identify top trusted users", async function () {
      const topUsers = await zippyTrust.getTopTrustedUsers(2);
      expect(topUsers.length).to.equal(2);
      expect(topUsers[0].userAddress).to.equal(user1.address); // Highest trust score
    });

    it("Should calculate trust percentiles", async function () {
      const percentile50 = await zippyTrust.getTrustPercentile(50);
      const percentile90 = await zippyTrust.getTrustPercentile(90);
      expect(percentile90).to.be.gte(percentile50);
    });
  });

  describe("Trust Field Analytics", function () {
    beforeEach(async function () {
      // Create multiple trust fields
      const fields = [
        {
          name: "Transaction Volume",
          dataType: 0, weight: 25, dataSource: 0, updateFrequency: 1, isActive: true
        },
        {
          name: "Network Uptime",
          dataType: 0, weight: 30, dataSource: 0, updateFrequency: 2, isActive: true
        },
        {
          name: "Community Engagement",
          dataType: 0, weight: 20, dataSource: 1, updateFrequency: 3, isActive: true
        }
      ];

      for (const field of fields) {
        await zippyTrust.createTrustField(field);
      }

      // Set field values for users
      await zippyTrust.setTrustFieldValue(user1.address, "Transaction Volume", 95);
      await zippyTrust.setTrustFieldValue(user1.address, "Network Uptime", 98);
      await zippyTrust.setTrustFieldValue(user1.address, "Community Engagement", 88);

      await zippyTrust.setTrustFieldValue(user2.address, "Transaction Volume", 78);
      await zippyTrust.setTrustFieldValue(user2.address, "Network Uptime", 85);
      await zippyTrust.setTrustFieldValue(user2.address, "Community Engagement", 92);
    });

    it("Should calculate field averages correctly", async function () {
      const avgVolume = await zippyTrust.getTrustFieldAverage("Transaction Volume");
      expect(avgVolume).to.equal(86); // (95 + 78) / 2

      const avgUptime = await zippyTrust.getTrustFieldAverage("Network Uptime");
      expect(avgUptime).to.equal(91); // (98 + 85) / 2
    });

    it("Should return field statistics", async function () {
      const stats = await zippyTrust.getTrustFieldStatistics("Transaction Volume");
      expect(stats.average).to.equal(86);
      expect(stats.maximum).to.equal(95);
      expect(stats.minimum).to.equal(78);
      expect(stats.count).to.equal(2);
    });

    it("Should calculate field correlations", async function () {
      // This would require more complex statistical analysis
      // For now, just test that the function exists and doesn't revert
      await expect(
        zippyTrust.getTrustFieldCorrelation("Transaction Volume", "Network Uptime")
      ).to.not.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await zippyTrust.pause();
      expect(await zippyTrust.paused()).to.be.true;

      await zippyTrust.unpause();
      expect(await zippyTrust.paused()).to.be.false;
    });

    it("Should only allow owner to pause", async function () {
      await expect(zippyTrust.connect(user1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent operations when paused", async function () {
      await zippyTrust.pause();

      const scoreData = {
        transactionSuccess: 80,
        validatorUptime: 85,
        stakingReliability: 75,
        networkParticipation: 70,
        governanceVoting: 90,
        socialReputation: 88,
        communityVoting: 82,
        liquidityProvision: 78,
        collateralStaking: 85,
        crossChainActivity: 80
      };

      await expect(
        zippyTrust.setTrustScore(user1.address, scoreData)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency update trust scores", async function () {
      await zippyTrust.emergencyUpdateTrustScore(user1.address, 25);

      const overallScore = await zippyTrust.calculateOverallTrustScore(user1.address);
      expect(overallScore).to.equal(25);
    });

    it("Should only allow owner to emergency update", async function () {
      await expect(
        zippyTrust.connect(user1).emergencyUpdateTrustScore(user2.address, 50)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow emergency trust field updates", async function () {
      // Create field first
      const fieldData = {
        name: "Emergency Field",
        dataType: 0,
        weight: 10,
        dataSource: 0,
        updateFrequency: 0,
        isActive: true
      };

      await zippyTrust.createTrustField(fieldData);
      await zippyTrust.emergencyUpdateTrustField(user1.address, "Emergency Field", 75);

      const fieldValue = await zippyTrust.getTrustFieldValue(user1.address, "Emergency Field");
      expect(fieldValue).to.equal(75);
    });
  });
});

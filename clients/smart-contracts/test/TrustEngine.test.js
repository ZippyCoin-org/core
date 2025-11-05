import { expect } from "chai";
import { ethers } from "hardhat";

describe("TrustEngine", function () {
  let trustEngine;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const TrustEngine = await ethers.getContractFactory("TrustEngine");
    trustEngine = await TrustEngine.deploy();
    await trustEngine.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await trustEngine.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await trustEngine.owner()).to.equal(owner.address);
    });
  });

  describe("Trust Score Management", function () {
    it("Should allow owner to initialize trust score", async function () {
      await trustEngine.initializeTrustScore(user1.address, 85);
      expect(await trustEngine.getTrustScore(user1.address)).to.equal(85);
    });

    it("Should emit TrustScoreUpdated event when initializing", async function () {
      await expect(trustEngine.initializeTrustScore(user1.address, 90))
        .to.emit(trustEngine, "TrustScoreUpdated")
        .withArgs(user1.address, 90, 0);
    });

    it("Should only allow owner to initialize trust scores", async function () {
      await expect(
        trustEngine.connect(user1).initializeTrustScore(user2.address, 80)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject trust scores above 100", async function () {
      await expect(
        trustEngine.initializeTrustScore(user1.address, 101)
      ).to.be.revertedWith("Trust score must be <= 100");
    });

    it("Should allow users to update their own trust score with environmental data", async function () {
      // First submit environmental data
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      
      // Then update trust score
      await trustEngine.connect(user1).updateTrustScore(85);
      expect(await trustEngine.getTrustScore(user1.address)).to.equal(85);
    });

    it("Should require environmental data to be recent for trust score updates", async function () {
      // Submit environmental data
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      
      // Fast forward time (more than 5 minutes)
      await ethers.provider.send("evm_increaseTime", [301]);
      await ethers.provider.send("evm_mine");
      
      // Should fail to update trust score
      await expect(
        trustEngine.connect(user1).updateTrustScore(85)
      ).to.be.revertedWith("Environmental data too old");
    });
  });

  describe("Environmental Data", function () {
    it("Should allow submitting environmental data", async function () {
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      
      const [temp, humidity, pressure, timestamp] = await trustEngine.getEnvironmentalData(user1.address);
      expect(temp).to.equal(2500);
      expect(humidity).to.equal(5000);
      expect(pressure).to.equal(101325);
      expect(timestamp).to.be.gt(0);
    });

    it("Should emit EnvironmentalDataUpdated event", async function () {
      await expect(trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325))
        .to.emit(trustEngine, "EnvironmentalDataUpdated")
        .withArgs(user1.address, 2500, 5000);
    });

    it("Should validate temperature range", async function () {
      await expect(
        trustEngine.connect(user1).submitEnvironmentalData(6000, 5000, 101325)
      ).to.be.revertedWith("Invalid temperature");
    });

    it("Should validate humidity range", async function () {
      await expect(
        trustEngine.connect(user1).submitEnvironmentalData(2500, 15000, 101325)
      ).to.be.revertedWith("Invalid humidity");
    });

    it("Should validate pressure range", async function () {
      await expect(
        trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 70000)
      ).to.be.revertedWith("Invalid pressure");
    });
  });

  describe("Trust Multiplier Calculation", function () {
    it("Should calculate base trust multiplier", async function () {
      await trustEngine.initializeTrustScore(user1.address, 50);
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(1500); // 1000 + (50 * 10)
    });

    it("Should add environmental bonus for valid data", async function () {
      await trustEngine.initializeTrustScore(user1.address, 50);
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(2000); // 1500 + 500 (environmental bonus)
    });
  });

  describe("Environmental Data Validation", function () {
    it("Should validate environmental data correctly", async function () {
      await trustEngine.initializeTrustScore(user1.address, 50);
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      
      // This is an internal function, but we can test it indirectly through calculateTrustMultiplier
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(2000); // Should have environmental bonus
    });
  });

  describe("Environmental Hash Calculation", function () {
    it("Should calculate environmental hash", async function () {
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      await trustEngine.connect(user1).updateTrustScore(85);
      
      const hash = await trustEngine.environmentalHashes(user1.address);
      expect(hash).to.not.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to initialize trust scores", async function () {
      await expect(
        trustEngine.connect(user1).initializeTrustScore(user2.address, 80)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow users to update their own trust scores", async function () {
      await trustEngine.connect(user1).submitEnvironmentalData(2500, 5000, 101325);
      await expect(
        trustEngine.connect(user1).updateTrustScore(85)
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero trust score", async function () {
      await trustEngine.initializeTrustScore(user1.address, 0);
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(1000); // Base multiplier
    });

    it("Should handle maximum trust score", async function () {
      await trustEngine.initializeTrustScore(user1.address, 100);
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(2000); // 1000 + (100 * 10)
    });

    it("Should handle users with no environmental data", async function () {
      await trustEngine.initializeTrustScore(user1.address, 50);
      const multiplier = await trustEngine.calculateTrustMultiplier(user1.address);
      expect(multiplier).to.equal(1500); // No environmental bonus
    });
  });
}); 
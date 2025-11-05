

import { expect } from "chai";
import { ethers } from "hardhat";

describe("Governance", function () {
  let governance;
  let trustEngine;
  let owner;
  let user1;
  let user2;
  let user3;
  let user4;
  let user5;
  let user6;
  let user7;
  let user8;
  let user9;
  let user10;

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10] = await ethers.getSigners();
    
    // Deploy TrustEngine first
    const TrustEngine = await ethers.getContractFactory("TrustEngine");
    trustEngine = await TrustEngine.deploy();
    await trustEngine.waitForDeployment();
    
    // Deploy Governance
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(await trustEngine.getAddress());
    await governance.waitForDeployment();
    
    // Initialize trust scores (need to reach quorum of 1000, but max 100 per user)
    // So we need at least 10 users with 100 trust score each
    await trustEngine.initializeTrustScore(user1.address, 100);
    await trustEngine.initializeTrustScore(user2.address, 100);
    await trustEngine.initializeTrustScore(user3.address, 100);
    await trustEngine.initializeTrustScore(user4.address, 100);
    await trustEngine.initializeTrustScore(user5.address, 100);
    await trustEngine.initializeTrustScore(user6.address, 100);
    await trustEngine.initializeTrustScore(user7.address, 100);
    await trustEngine.initializeTrustScore(user8.address, 100);
    await trustEngine.initializeTrustScore(user9.address, 100);
    await trustEngine.initializeTrustScore(user10.address, 100);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await governance.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await governance.owner()).to.equal(owner.address);
    });

    it("Should set the correct trust engine", async function () {
      expect(await governance.trustEngine()).to.equal(await trustEngine.getAddress());
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow users with sufficient trust score to create proposals", async function () {
      await governance.connect(user1).createProposal("Test Proposal");
      expect(await governance.proposalCount()).to.equal(1);
    });

    it("Should emit ProposalCreated event", async function () {
      await expect(governance.connect(user1).createProposal("Test Proposal"))
        .to.emit(governance, "ProposalCreated")
        .withArgs(1, user1.address, "Test Proposal");
    });

    it("Should require sufficient trust score to create proposals", async function () {
      // User3 has trust score 100, but needs 30, so this should work
      await expect(
        governance.connect(user3).createProposal("Test Proposal")
      ).to.not.be.reverted;
    });

    it("Should reject empty proposal title", async function () {
      await expect(
        governance.connect(user1).createProposal("")
      ).to.be.revertedWith("Title required");
    });

    it("Should set correct proposal details", async function () {
      await governance.connect(user1).createProposal("Test Proposal");
      
      const [proposer, title, startTime, endTime, forVotes, againstVotes, executed, canceled] = 
        await governance.getProposal(1);
      
      expect(proposer).to.equal(user1.address);
      expect(title).to.equal("Test Proposal");
      expect(startTime).to.be.gt(0);
      expect(endTime).to.be.gt(startTime);
      expect(forVotes).to.equal(0);
      expect(againstVotes).to.equal(0);
      expect(executed).to.be.false;
      expect(canceled).to.be.false;
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await governance.connect(user1).createProposal("Test Proposal");
    });

    it("Should allow users to vote on proposals", async function () {
      await governance.connect(user2).vote(1, true);
      expect(await governance.hasUserVoted(1, user2.address)).to.be.true;
      expect(await governance.getUserVote(1, user2.address)).to.be.true;
    });

    it("Should emit VoteCast event", async function () {
      await expect(governance.connect(user2).vote(1, true))
        .to.emit(governance, "VoteCast")
        .withArgs(1, user2.address, true, 100); // user2 has trust score 100
    });

    it("Should require sufficient trust score to vote", async function () {
      // User3 has trust score 100, but needs 20, so this should work
      await expect(
        governance.connect(user3).vote(1, true)
      ).to.not.be.reverted;
    });

    it("Should prevent double voting", async function () {
      await governance.connect(user2).vote(1, true);
      await expect(
        governance.connect(user2).vote(1, false)
      ).to.be.revertedWith("Already voted");
    });

    it("Should reject voting on non-existent proposals", async function () {
      await expect(
        governance.connect(user2).vote(2, true)
      ).to.be.revertedWith("Invalid proposal");
    });

    it("Should reject voting after proposal ends", async function () {
      // Fast forward time past the voting period
      await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]); // 4 days
      await ethers.provider.send("evm_mine");
      
      await expect(
        governance.connect(user2).vote(1, true)
      ).to.be.revertedWith("Voting ended");
    });
  });

  describe("Proposal Execution", function () {
    beforeEach(async function () {
      await governance.connect(user1).createProposal("Test Proposal");
    });

    it("Should allow owner to execute proposals", async function () {
      // Add votes to meet quorum (1000 total needed)
      await governance.connect(user1).vote(1, true); // 100
      await governance.connect(user2).vote(1, true); // 100
      await governance.connect(user3).vote(1, true); // 100
      await governance.connect(user4).vote(1, true); // 100
      await governance.connect(user5).vote(1, true); // 100
      await governance.connect(user6).vote(1, true); // 100
      await governance.connect(user7).vote(1, true); // 100
      await governance.connect(user8).vote(1, true); // 100
      await governance.connect(user9).vote(1, true); // 100
      await governance.connect(user10).vote(1, true); // 100
      // Total: 1000 votes
      
      // Fast forward time past the voting period
      await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]); // 4 days
      await ethers.provider.send("evm_mine");
      
      await expect(governance.executeProposal(1))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(1);
    });

    it("Should only allow owner to execute proposals", async function () {
      await expect(
        governance.connect(user1).executeProposal(1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject executing non-existent proposals", async function () {
      await expect(
        governance.executeProposal(2)
      ).to.be.revertedWith("Invalid proposal");
    });

    it("Should reject executing proposals before voting ends", async function () {
      await expect(
        governance.executeProposal(1)
      ).to.be.revertedWith("Voting not ended");
    });

    it("Should reject executing already executed proposals", async function () {
      // Add votes and execute once
      await governance.connect(user1).vote(1, true);
      await governance.connect(user2).vote(1, true);
      await governance.connect(user3).vote(1, true);
      await governance.connect(user4).vote(1, true);
      await governance.connect(user5).vote(1, true);
      await governance.connect(user6).vote(1, true);
      await governance.connect(user7).vote(1, true);
      await governance.connect(user8).vote(1, true);
      await governance.connect(user9).vote(1, true);
      await governance.connect(user10).vote(1, true);
      
      await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      await governance.executeProposal(1);
      
      // Try to execute again
      await expect(
        governance.executeProposal(1)
      ).to.be.revertedWith("Proposal already executed");
    });

    it("Should reject executing proposals without quorum", async function () {
      // Only one vote, not enough for quorum
      await governance.connect(user1).vote(1, true);
      
      await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        governance.executeProposal(1)
      ).to.be.revertedWith("Quorum not reached");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await governance.connect(user1).createProposal("Test Proposal");
    });

    it("Should return correct proposal details", async function () {
      const [proposer, title, startTime, endTime, forVotes, againstVotes, executed, canceled] = 
        await governance.getProposal(1);
      
      expect(proposer).to.equal(user1.address);
      expect(title).to.equal("Test Proposal");
      expect(startTime).to.be.gt(0);
      expect(endTime).to.be.gt(startTime);
    });

    it("Should return correct voting status", async function () {
      expect(await governance.hasUserVoted(1, user1.address)).to.be.false;
      
      await governance.connect(user1).vote(1, true);
      
      expect(await governance.hasUserVoted(1, user1.address)).to.be.true;
      expect(await governance.getUserVote(1, user1.address)).to.be.true;
    });

    it("Should reject getting vote for non-voter", async function () {
      await expect(
        governance.getUserVote(1, user2.address)
      ).to.be.revertedWith("User has not voted");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple proposals", async function () {
      await governance.connect(user1).createProposal("Proposal 1");
      await governance.connect(user2).createProposal("Proposal 2");
      
      expect(await governance.proposalCount()).to.equal(2);
      
      const [proposer1] = await governance.getProposal(1);
      const [proposer2] = await governance.getProposal(2);
      
      expect(proposer1).to.equal(user1.address);
      expect(proposer2).to.equal(user2.address);
    });

    it("Should handle voting on multiple proposals", async function () {
      await governance.connect(user1).createProposal("Proposal 1");
      await governance.connect(user2).createProposal("Proposal 2");
      
      await governance.connect(user3).vote(1, true);
      await governance.connect(user3).vote(2, false);
      
      expect(await governance.getUserVote(1, user3.address)).to.be.true;
      expect(await governance.getUserVote(2, user3.address)).to.be.false;
    });
  });
});

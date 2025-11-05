const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivacyGovernance", function () {
  let privacyGovernance;
  let owner;
  let originWallet1;
  let originWallet2;
  let originWallet3;
  let tokenHolder1;
  let tokenHolder2;
  let addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, originWallet1, originWallet2, originWallet3, tokenHolder1, tokenHolder2, addr1, addr2, addr3] = await ethers.getSigners();

    const PrivacyGovernance = await ethers.getContractFactory("PrivacyGovernance");
    privacyGovernance = await PrivacyGovernance.deploy();
    await privacyGovernance.deployed();

    // Add origin wallets
    await privacyGovernance.addOriginWallet(originWallet1.address, "US");
    await privacyGovernance.addOriginWallet(originWallet2.address, "EU");
    await privacyGovernance.addOriginWallet(originWallet3.address, "AS");

    // Set up token balances for testing (simplified - in real implementation, this would be managed by the token contract)
    // For testing purposes, we'll simulate token balances
    await privacyGovernance.connect(owner).emergencyUpdateParams({
      maxBridgeDailyLimit: ethers.utils.parseEther("1000000"),
      minRingSize: 11,
      zkRollupBatchSize: 100,
      optionalKycEnabled: true,
      bridgeTimeoutHours: 24,
      maxBridgeAmount: ethers.utils.parseEther("10000"),
      bridgeFeePercentage: 10
    });
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await privacyGovernance.owner()).to.equal(owner.address);
    });

    it("Should initialize with default privacy parameters", async function () {
      const params = await privacyGovernance.getCurrentPrivacyParams();
      expect(params.maxBridgeDailyLimit).to.equal(ethers.utils.parseEther("1000000"));
      expect(params.minRingSize).to.equal(11);
      expect(params.zkRollupBatchSize).to.equal(100);
      expect(params.optionalKycEnabled).to.be.true;
      expect(params.bridgeTimeoutHours).to.equal(24);
      expect(params.maxBridgeAmount).to.equal(ethers.utils.parseEther("10000"));
      expect(params.bridgeFeePercentage).to.equal(10);
    });

    it("Should have correct total origin wallets", async function () {
      expect(await privacyGovernance.totalOriginWallets()).to.equal(3);
    });
  });

  describe("Origin Wallet Management", function () {
    it("Should allow owner to add origin wallets", async function () {
      await expect(privacyGovernance.addOriginWallet(addr1.address, "CA"))
        .to.emit(privacyGovernance, "OriginWalletAdded")
        .withArgs(addr1.address, "CA");
      
      expect(await privacyGovernance.originWallets(addr1.address)).to.be.true;
      expect(await privacyGovernance.totalOriginWallets()).to.equal(4);
    });

    it("Should not allow non-owner to add origin wallets", async function () {
      await expect(
        privacyGovernance.connect(addr1).addOriginWallet(addr2.address, "AU")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow adding zero address", async function () {
      await expect(
        privacyGovernance.addOriginWallet(ethers.constants.AddressZero, "XX")
      ).to.be.revertedWith("PrivacyGovernance: Invalid wallet address");
    });

    it("Should not allow adding duplicate origin wallet", async function () {
      await expect(
        privacyGovernance.addOriginWallet(originWallet1.address, "US")
      ).to.be.revertedWith("PrivacyGovernance: Wallet already registered");
    });

    it("Should allow origin wallets to remove other origin wallets", async function () {
      await expect(privacyGovernance.connect(originWallet1).removeOriginWallet(originWallet2.address))
        .to.emit(privacyGovernance, "OriginWalletRemoved")
        .withArgs(originWallet2.address);
      
      expect(await privacyGovernance.originWallets(originWallet2.address)).to.be.false;
      expect(await privacyGovernance.totalOriginWallets()).to.equal(2);
    });

    it("Should not allow removing the last origin wallet", async function () {
      // Remove two origin wallets first
      await privacyGovernance.connect(originWallet1).removeOriginWallet(originWallet2.address);
      await privacyGovernance.connect(originWallet1).removeOriginWallet(originWallet3.address);
      
      // Try to remove the last one
      await expect(
        privacyGovernance.connect(originWallet1).removeOriginWallet(originWallet1.address)
      ).to.be.revertedWith("PrivacyGovernance: Cannot remove last origin wallet");
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow origin wallets to create proposals", async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await expect(
        privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
          "Increase Bridge Limits",
          "Increase daily bridge limit to 2M ZPC and ring size to 15",
          newParams
        )
      ).to.emit(privacyGovernance, "ProposalCreated")
        .withArgs(1, originWallet1.address, "Increase Bridge Limits");
    });

    it("Should not allow non-origin wallets to create proposals", async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await expect(
        privacyGovernance.connect(addr1).proposePrivacyParamChange(
          "Invalid Proposal",
          "This should fail",
          newParams
        )
      ).to.be.revertedWith("PrivacyGovernance: Only origin wallets can perform this action");
    });

    it("Should validate proposal parameters", async function () {
      const invalidParams = {
        maxBridgeDailyLimit: 0, // Invalid
        minRingSize: 3, // Too small
        zkRollupBatchSize: 0, // Invalid
        optionalKycEnabled: true,
        bridgeTimeoutHours: 0, // Invalid
        maxBridgeAmount: 0, // Invalid
        bridgeFeePercentage: 2000 // Too high (>10%)
      };

      await expect(
        privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
          "Invalid Proposal",
          "This should fail due to invalid parameters",
          invalidParams
        )
      ).to.be.revertedWith("PrivacyGovernance: Invalid daily limit");
    });

    it("Should not allow empty title or description", async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await expect(
        privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
          "", // Empty title
          "Description",
          newParams
        )
      ).to.be.revertedWith("PrivacyGovernance: Title cannot be empty");

      await expect(
        privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
          "Title",
          "", // Empty description
          newParams
        )
      ).to.be.revertedWith("PrivacyGovernance: Description cannot be empty");
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
        "Test Proposal",
        "Test description",
        newParams
      );
      proposalId = 1;
    });

    it("Should allow origin wallets to vote", async function () {
      await expect(privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true))
        .to.emit(privacyGovernance, "VoteCast")
        .withArgs(proposalId, originWallet1.address, true, 1);
    });

    it("Should not allow origin wallets to vote twice", async function () {
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);
      
      await expect(
        privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, false)
      ).to.be.revertedWith("PrivacyGovernance: Already voted");
    });

    it("Should not allow non-origin wallets to vote as origin wallets", async function () {
      await expect(
        privacyGovernance.connect(addr1).voteOriginWallet(proposalId, true)
      ).to.be.revertedWith("PrivacyGovernance: Only origin wallets can perform this action");
    });

    it("Should not allow voting on invalid proposals", async function () {
      await expect(
        privacyGovernance.connect(originWallet1).voteOriginWallet(999, true)
      ).to.be.revertedWith("PrivacyGovernance: Invalid proposal ID");
    });

    it("Should not allow voting after voting period ends", async function () {
      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // 7 days + 1 second
      await ethers.provider.send("evm_mine");
      
      await expect(
        privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true)
      ).to.be.revertedWith("PrivacyGovernance: Proposal not active");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId;

    beforeEach(async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
        "Test Proposal",
        "Test description",
        newParams
      );
      proposalId = 1;
    });

    it("Should execute proposal when it passes both chambers", async function () {
      // All origin wallets vote yes
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet2).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet3).voteOriginWallet(proposalId, true);

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute proposal
      await expect(privacyGovernance.executeProposal(proposalId))
        .to.emit(privacyGovernance, "ProposalExecuted")
        .withArgs(proposalId)
        .and.to.emit(privacyGovernance, "PrivacyParamsUpdated");

      // Check that parameters were updated
      const params = await privacyGovernance.getCurrentPrivacyParams();
      expect(params.maxBridgeDailyLimit).to.equal(ethers.utils.parseEther("2000000"));
      expect(params.minRingSize).to.equal(15);
    });

    it("Should not execute proposal before voting period ends", async function () {
      // All origin wallets vote yes
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet2).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet3).voteOriginWallet(proposalId, true);

      // Try to execute before voting period ends
      await expect(
        privacyGovernance.executeProposal(proposalId)
      ).to.be.revertedWith("PrivacyGovernance: Voting still active");
    });

    it("Should not execute proposal that doesn't pass", async function () {
      // Only one origin wallet votes yes (not enough for 66% threshold)
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Try to execute
      await expect(
        privacyGovernance.executeProposal(proposalId)
      ).to.be.revertedWith("PrivacyGovernance: Proposal did not pass");
    });

    it("Should not execute already executed proposal", async function () {
      // All origin wallets vote yes
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet2).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet3).voteOriginWallet(proposalId, true);

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Execute proposal
      await privacyGovernance.executeProposal(proposalId);

      // Try to execute again
      await expect(
        privacyGovernance.executeProposal(proposalId)
      ).to.be.revertedWith("PrivacyGovernance: Already executed");
    });
  });

  describe("Veto Functionality", function () {
    let proposalId;

    beforeEach(async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
        "Test Proposal",
        "Test description",
        newParams
      );
      proposalId = 1;
    });

    it("Should allow origin wallets to veto proposals", async function () {
      await expect(privacyGovernance.connect(originWallet1).vetoProposal(proposalId))
        .to.emit(privacyGovernance, "ProposalVetoed")
        .withArgs(proposalId, originWallet1.address);
    });

    it("Should not allow vetoing after voting period ends", async function () {
      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        privacyGovernance.connect(originWallet1).vetoProposal(proposalId)
      ).to.be.revertedWith("PrivacyGovernance: Voting period ended");
    });

    it("Should not allow executing vetoed proposals", async function () {
      // Veto the proposal
      await privacyGovernance.connect(originWallet1).vetoProposal(proposalId);

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Try to execute
      await expect(
        privacyGovernance.executeProposal(proposalId)
      ).to.be.revertedWith("PrivacyGovernance: Proposal vetoed");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause the contract", async function () {
      await privacyGovernance.emergencyPause();
      expect(await privacyGovernance.paused()).to.be.true;
    });

    it("Should allow owner to unpause the contract", async function () {
      await privacyGovernance.emergencyPause();
      await privacyGovernance.emergencyUnpause();
      expect(await privacyGovernance.paused()).to.be.false;
    });

    it("Should allow owner to emergency update parameters", async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("5000000"),
        minRingSize: 20,
        zkRollupBatchSize: 500,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 72,
        maxBridgeAmount: ethers.utils.parseEther("50000"),
        bridgeFeePercentage: 50
      };

      await expect(privacyGovernance.emergencyUpdateParams(newParams))
        .to.emit(privacyGovernance, "PrivacyParamsUpdated");

      const params = await privacyGovernance.getCurrentPrivacyParams();
      expect(params.maxBridgeDailyLimit).to.equal(ethers.utils.parseEther("5000000"));
      expect(params.minRingSize).to.equal(20);
    });

    it("Should not allow non-owner to use emergency functions", async function () {
      await expect(
        privacyGovernance.connect(addr1).emergencyPause()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        privacyGovernance.connect(addr1).emergencyUnpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    let proposalId;

    beforeEach(async function () {
      const newParams = {
        maxBridgeDailyLimit: ethers.utils.parseEther("2000000"),
        minRingSize: 15,
        zkRollupBatchSize: 200,
        optionalKycEnabled: false,
        bridgeTimeoutHours: 48,
        maxBridgeAmount: ethers.utils.parseEther("20000"),
        bridgeFeePercentage: 20
      };

      await privacyGovernance.connect(originWallet1).proposePrivacyParamChange(
        "Test Proposal",
        "Test description",
        newParams
      );
      proposalId = 1;
    });

    it("Should return correct proposal details", async function () {
      const proposal = await privacyGovernance.getProposal(proposalId);
      expect(proposal.id).to.equal(1);
      expect(proposal.proposer).to.equal(originWallet1.address);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("Test description");
      expect(proposal.executed).to.be.false;
      expect(proposal.vetoed).to.be.false;
    });

    it("Should return correct total proposals count", async function () {
      expect(await privacyGovernance.getTotalProposals()).to.equal(1);
    });

    it("Should correctly check if proposal can be executed", async function () {
      // Initially should not be executable
      expect(await privacyGovernance.canExecuteProposal(proposalId)).to.be.false;

      // All origin wallets vote yes
      await privacyGovernance.connect(originWallet1).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet2).voteOriginWallet(proposalId, true);
      await privacyGovernance.connect(originWallet3).voteOriginWallet(proposalId, true);

      // Still not executable (voting period not ended)
      expect(await privacyGovernance.canExecuteProposal(proposalId)).to.be.false;

      // Fast forward time to after voting period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");

      // Now should be executable
      expect(await privacyGovernance.canExecuteProposal(proposalId)).to.be.true;
    });
  });
});











import { expect } from "chai";
import { ethers } from "hardhat";

describe("Bridge", function () {
  let bridge;
  let trustEngine;
  let mockToken;
  let owner;
  let user1;
  let user2;
  let validator1;
  let validator2;
  let validator3;

  beforeEach(async function () {
    [owner, user1, user2, validator1, validator2, validator3] = await ethers.getSigners();

    // Deploy TrustEngine first
    const TrustEngine = await ethers.getContractFactory("TrustEngine");
    trustEngine = await TrustEngine.deploy();
    await trustEngine.waitForDeployment();

    // Deploy Bridge
    const Bridge = await ethers.getContractFactory("Bridge");
    bridge = await Bridge.deploy(await trustEngine.getAddress());
    await bridge.waitForDeployment();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();

    // Initialize trust scores
    await trustEngine.initializeTrustScore(validator1.address, 80);
    await trustEngine.initializeTrustScore(validator2.address, 70);
    await trustEngine.initializeTrustScore(validator3.address, 60);
    await trustEngine.initializeTrustScore(user1.address, 75);
    await trustEngine.initializeTrustScore(user2.address, 45);

    // Add validators
    await bridge.addValidator(validator1.address);
    await bridge.addValidator(validator2.address);
    await bridge.addValidator(validator3.address);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await bridge.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await bridge.owner()).to.equal(owner.address);
    });

    it("Should set the correct trust engine", async function () {
      expect(await bridge.trustEngine()).to.equal(await trustEngine.getAddress());
    });
  });

  describe("Validator Management", function () {
    it("Should allow owner to add validators", async function () {
      const newValidator = ethers.Wallet.createRandom().address;
      await expect(bridge.addValidator(newValidator))
        .to.emit(bridge, "ValidatorAdded")
        .withArgs(newValidator, 0);
      expect(await bridge.validators(newValidator)).to.be.true;
    });

    it("Should only allow owner to add validators", async function () {
      const newValidator = ethers.Wallet.createRandom().address;
      await expect(
        bridge.connect(user1).addValidator(newValidator)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to remove validators", async function () {
      await expect(bridge.removeValidator(validator1.address))
        .to.emit(bridge, "ValidatorRemoved")
        .withArgs(validator1.address);
      expect(await bridge.validators(validator1.address)).to.be.false;
    });

    it("Should only allow owner to remove validators", async function () {
      await expect(
        bridge.connect(user1).removeValidator(validator1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should update validator trust scores", async function () {
      await bridge.updateValidatorTrustScore(validator1.address);
      const expectedScore = await trustEngine.getTrustScore(validator1.address);
      expect(await bridge.validatorTrustScores(validator1.address)).to.equal(expectedScore);
    });
  });

  describe("Transfer Initiation", function () {
    beforeEach(async function () {
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await bridge.getAddress(), ethers.parseEther("1000"));
    });

    it("Should allow users to initiate transfers", async function () {
      const amount = ethers.parseEther("100");
      const targetChainId = 1;

      const tx = await bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      );

      const receipt = await tx.wait();
      const transferId = receipt.logs[0].topics[1]; // Get transferId from event

      expect(await bridge.processedTransfers(transferId)).to.be.true;
    });

    it("Should emit TransferInitiated event", async function () {
      const amount = ethers.parseEther("100");
      const targetChainId = 1;

      await expect(bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      )).to.emit(bridge, "TransferInitiated");
    });

    it("Should transfer tokens to bridge contract", async function () {
      const amount = ethers.parseEther("100");
      const targetChainId = 1;
      const initialBalance = await mockToken.balanceOf(await bridge.getAddress());

      await bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      );

      expect(await mockToken.balanceOf(await bridge.getAddress())).to.equal(initialBalance + amount);
    });

    it("Should reject transfers with insufficient balance", async function () {
      const amount = ethers.parseEther("10000"); // More than user's balance
      const targetChainId = 1;

      await expect(bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      )).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should reject zero amount transfers", async function () {
      const targetChainId = 1;

      await expect(bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        0,
        user2.address,
        targetChainId
      )).to.be.revertedWith("Amount must be positive");
    });

    it("Should reject invalid token address", async function () {
      const amount = ethers.parseEther("100");
      const targetChainId = 1;

      await expect(bridge.connect(user1).initiateTransfer(
        ethers.ZeroAddress,
        amount,
        user2.address,
        targetChainId
      )).to.be.revertedWith("Invalid token");
    });
  });

  describe("Transfer Validation", function () {
    let transferId;

    beforeEach(async function () {
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await bridge.getAddress(), ethers.parseEther("1000"));

      const amount = ethers.parseEther("100");
      const targetChainId = 1;

      const tx = await bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      );

      const receipt = await tx.wait();
      transferId = receipt.logs[0].topics[1];
    });

    it("Should allow validators to validate transfers", async function () {
      await expect(bridge.connect(validator1).validateTransfer(transferId))
        .to.emit(bridge, "TransferValidated");
    });

    it("Should only allow active validators to validate", async function () {
      await expect(bridge.connect(user1).validateTransfer(transferId))
        .to.be.revertedWith("Not a validator");
    });

    it("Should reject validation of non-existent transfers", async function () {
      const fakeTransferId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(bridge.connect(validator1).validateTransfer(fakeTransferId))
        .to.be.revertedWith("Transfer not found");
    });

    it("Should reject duplicate validations", async function () {
      await bridge.connect(validator1).validateTransfer(transferId);
      await expect(bridge.connect(validator1).validateTransfer(transferId))
        .to.be.revertedWith("Already validated");
    });

    it("Should complete transfer after required validations", async function () {
      // Need 3 validations (requiredValidations = 3)
      await bridge.connect(validator1).validateTransfer(transferId);
      await bridge.connect(validator2).validateTransfer(transferId);
      await bridge.connect(validator3).validateTransfer(transferId);

      // Check that transfer is completed
      expect(await mockToken.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should emit TransferCompleted event when fully validated", async function () {
      // Need 3 validations
      await bridge.connect(validator1).validateTransfer(transferId);
      await bridge.connect(validator2).validateTransfer(transferId);

      await expect(bridge.connect(validator3).validateTransfer(transferId))
        .to.emit(bridge, "TransferCompleted");
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to update minimum trust score", async function () {
      await bridge.updateMinValidatorTrustScore(75);
      expect(await bridge.minValidatorTrustScore()).to.equal(75);
    });

    it("Should only allow owner to update minimum trust score", async function () {
      await expect(bridge.connect(user1).updateMinValidatorTrustScore(75))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update required validations", async function () {
      await bridge.updateRequiredValidations(5);
      expect(await bridge.requiredValidations()).to.equal(5);
    });

    it("Should only allow owner to update required validations", async function () {
      await expect(bridge.connect(user1).updateRequiredValidations(5))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject zero required validations", async function () {
      await expect(bridge.updateRequiredValidations(0))
        .to.be.revertedWith("Required validations must be positive");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw tokens", async function () {
      await mockToken.mint(await bridge.getAddress(), ethers.parseEther("100"));
      await bridge.emergencyWithdraw(await mockToken.getAddress());

      expect(await mockToken.balanceOf(owner.address)).to.be.gt(0);
    });

    it("Should only allow owner to emergency withdraw", async function () {
      await expect(
        bridge.connect(user1).emergencyWithdraw(await mockToken.getAddress())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    it("Should return correct validator count", async function () {
      expect(await bridge.getValidatorCount()).to.equal(3);
    });

    it("Should return correct active validators", async function () {
      const validators = await bridge.getActiveValidators();
      expect(validators.length).to.equal(3);
      expect(validators).to.include(validator1.address);
      expect(validators).to.include(validator2.address);
      expect(validators).to.include(validator3.address);
    });

    it("Should return correct transfer status", async function () {
      await mockToken.mint(user1.address, ethers.parseEther("1000"));
      await mockToken.connect(user1).approve(await bridge.getAddress(), ethers.parseEther("1000"));

      const amount = ethers.parseEther("100");
      const targetChainId = 1;

      const tx = await bridge.connect(user1).initiateTransfer(
        await mockToken.getAddress(),
        amount,
        user2.address,
        targetChainId
      );

      const receipt = await tx.wait();
      const transferId = receipt.logs[0].topics[1];

      const status = await bridge.getTransferStatus(transferId);
      expect(status.exists).to.be.true;
      expect(status.validations).to.equal(0);
      expect(status.completed).to.be.false;
    });
  });
});

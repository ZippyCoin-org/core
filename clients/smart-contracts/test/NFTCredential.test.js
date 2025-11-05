import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTCredential", function () {
  let nftCredential;
  let trustEngine;
  let owner;
  let issuer1;
  let issuer2;
  let recipient1;
  let recipient2;

  beforeEach(async function () {
    [owner, issuer1, issuer2, recipient1, recipient2] = await ethers.getSigners();

    // Deploy TrustEngine first
    const TrustEngine = await ethers.getContractFactory("TrustEngine");
    trustEngine = await TrustEngine.deploy();
    await trustEngine.waitForDeployment();

    // Deploy NFTCredential
    const NFTCredential = await ethers.getContractFactory("NFTCredential");
    nftCredential = await NFTCredential.deploy(await trustEngine.getAddress());
    await nftCredential.waitForDeployment();

    // Initialize trust scores
    await trustEngine.initializeTrustScore(issuer1.address, 85);
    await trustEngine.initializeTrustScore(issuer2.address, 70);
    await trustEngine.initializeTrustScore(recipient1.address, 80);
    await trustEngine.initializeTrustScore(recipient2.address, 60);

    // Authorize issuers
    await nftCredential.authorizeIssuer(issuer1.address);
    await nftCredential.authorizeIssuer(issuer2.address);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await nftCredential.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await nftCredential.owner()).to.equal(owner.address);
    });

    it("Should set the correct trust engine", async function () {
      expect(await nftCredential.trustEngine()).to.equal(await trustEngine.getAddress());
    });

    it("Should have correct name and symbol", async function () {
      expect(await nftCredential.name()).to.equal("ZippyCoin Credentials");
      expect(await nftCredential.symbol()).to.equal("ZPC-CRED");
    });
  });

  describe("Issuer Management", function () {
    it("Should allow owner to authorize issuers", async function () {
      const newIssuer = ethers.Wallet.createRandom().address;
      await expect(nftCredential.authorizeIssuer(newIssuer))
        .to.emit(nftCredential, "IssuerAuthorized");
      expect(await nftCredential.authorizedIssuers(newIssuer)).to.be.true;
    });

    it("Should only allow owner to authorize issuers", async function () {
      const newIssuer = ethers.Wallet.createRandom().address;
      await expect(
        nftCredential.connect(issuer1).authorizeIssuer(newIssuer)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to revoke issuers", async function () {
      await expect(nftCredential.revokeIssuer(issuer1.address))
        .to.emit(nftCredential, "IssuerRevoked")
        .withArgs(issuer1.address);
      expect(await nftCredential.authorizedIssuers(issuer1.address)).to.be.false;
    });

    it("Should only allow owner to revoke issuers", async function () {
      await expect(
        nftCredential.connect(issuer1).revokeIssuer(issuer1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should update issuer trust scores", async function () {
      await nftCredential.updateIssuerTrustScore(issuer1.address);
      const expectedScore = await trustEngine.getTrustScore(issuer1.address);
      expect(await nftCredential.issuerTrustScores(issuer1.address)).to.equal(expectedScore);
    });
  });

  describe("Credential Issuance", function () {
    it("Should allow authorized issuers to issue credentials", async function () {
      const credentialType = "Verified Identity";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year

      await expect(nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      )).to.emit(nftCredential, "CredentialIssued");

      // Check that NFT was minted
      expect(await nftCredential.balanceOf(recipient1.address)).to.equal(1);
    });

    it("Should only allow authorized issuers to issue credentials", async function () {
      const credentialType = "Verified Identity";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(nftCredential.connect(recipient1).issueCredential(
        recipient2.address,
        credentialType,
        expirationDate
      )).to.be.revertedWith("Not authorized issuer");
    });

    it("Should reject invalid recipient address", async function () {
      const credentialType = "Verified Identity";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(nftCredential.connect(issuer1).issueCredential(
        ethers.ZeroAddress,
        credentialType,
        expirationDate
      )).to.be.revertedWith("Invalid recipient");
    });

    it("Should reject empty credential type", async function () {
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        "",
        expirationDate
      )).to.be.revertedWith("Invalid credential type");
    });

    it("Should store credential metadata correctly", async function () {
      const credentialType = "Professional Certification";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      );

      const receipt = await tx.wait();
      const tokenId = receipt.logs[0].topics[1]; // Get tokenId from event

      expect(await nftCredential.credentialTypes(tokenId)).to.equal(credentialType);
      expect(await nftCredential.expirationDates(tokenId)).to.equal(expirationDate);
      expect(await nftCredential.issuers(tokenId)).to.equal(issuer1.address);
      expect(await nftCredential.isRevoked(tokenId)).to.be.false;
    });
  });

  describe("Credential Verification", function () {
    let tokenId;

    beforeEach(async function () {
      const credentialType = "Identity Verification";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      );

      const receipt = await tx.wait();
      tokenId = receipt.logs[0].topics[1];
    });

    it("Should verify valid credentials", async function () {
      const isValid = await nftCredential.verifyCredential(tokenId);
      expect(isValid).to.be.true;
    });

    it("Should reject verification of non-existent credentials", async function () {
      const isValid = await nftCredential.verifyCredential(999);
      expect(isValid).to.be.false;
    });

    it("Should reject verification of expired credentials", async function () {
      // Fast forward time past expiration
      const expiredDate = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      await ethers.provider.send("evm_setNextBlockTimestamp", [expiredDate]);

      const isValid = await nftCredential.verifyCredential(tokenId);
      expect(isValid).to.be.false;
    });

    it("Should reject verification of revoked credentials", async function () {
      await nftCredential.connect(issuer1).revokeCredential(tokenId);

      const isValid = await nftCredential.verifyCredential(tokenId);
      expect(isValid).to.be.false;
    });
  });

  describe("Credential Revocation", function () {
    let tokenId;

    beforeEach(async function () {
      const credentialType = "Security Clearance";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      );

      const receipt = await tx.wait();
      tokenId = receipt.logs[0].topics[1];
    });

    it("Should allow issuer to revoke their credentials", async function () {
      await expect(nftCredential.connect(issuer1).revokeCredential(tokenId))
        .to.emit(nftCredential, "CredentialRevoked")
        .withArgs(tokenId, issuer1.address);

      expect(await nftCredential.isRevoked(tokenId)).to.be.true;
    });

    it("Should only allow issuer to revoke their credentials", async function () {
      await expect(nftCredential.connect(issuer2).revokeCredential(tokenId))
        .to.be.revertedWith("Not the issuer");
    });

    it("Should reject revocation of non-existent credentials", async function () {
      await expect(nftCredential.connect(issuer1).revokeCredential(999))
        .to.be.revertedWith("Credential does not exist");
    });
  });

  describe("Credential Transfer", function () {
    let tokenId;

    beforeEach(async function () {
      const credentialType = "Achievement Badge";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      );

      const receipt = await tx.wait();
      tokenId = receipt.logs[0].topics[1];
    });

    it("Should allow credential holders to transfer NFTs", async function () {
      await nftCredential.connect(recipient1).transferFrom(
        recipient1.address,
        recipient2.address,
        tokenId
      );

      expect(await nftCredential.ownerOf(tokenId)).to.equal(recipient2.address);
      expect(await nftCredential.balanceOf(recipient1.address)).to.equal(0);
      expect(await nftCredential.balanceOf(recipient2.address)).to.equal(1);
    });

    it("Should maintain credential metadata after transfer", async function () {
      await nftCredential.connect(recipient1).transferFrom(
        recipient1.address,
        recipient2.address,
        tokenId
      );

      expect(await nftCredential.credentialTypes(tokenId)).to.equal("Achievement Badge");
      expect(await nftCredential.issuers(tokenId)).to.equal(issuer1.address);
    });
  });

  describe("Batch Operations", function () {
    it("Should allow batch credential verification", async function () {
      // Issue multiple credentials
      const tokenIds = [];

      for (let i = 0; i < 3; i++) {
        const credentialType = `Credential ${i}`;
        const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

        const tx = await nftCredential.connect(issuer1).issueCredential(
          recipient1.address,
          credentialType,
          expirationDate
        );

        const receipt = await tx.wait();
        tokenIds.push(receipt.logs[0].topics[1]);
      }

      const results = await nftCredential.batchVerifyCredentials(tokenIds);
      expect(results.length).to.equal(3);
      results.forEach(result => {
        expect(result).to.be.true;
      });
    });

    it("Should handle mixed valid/invalid credentials in batch verification", async function () {
      // Issue 2 valid credentials
      const validIds = [];
      for (let i = 0; i < 2; i++) {
        const credentialType = `Valid Credential ${i}`;
        const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

        const tx = await nftCredential.connect(issuer1).issueCredential(
          recipient1.address,
          credentialType,
          expirationDate
        );

        const receipt = await tx.wait();
        validIds.push(receipt.logs[0].topics[1]);
      }

      // Add invalid token IDs
      const allIds = [...validIds, 999, 1000];

      const results = await nftCredential.batchVerifyCredentials(allIds);
      expect(results.length).to.equal(4);
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.true;
      expect(results[2]).to.be.false;
      expect(results[3]).to.be.false;
    });
  });

  describe("View Functions", function () {
    let tokenId;

    beforeEach(async function () {
      const credentialType = "Test Credential";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await nftCredential.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        expirationDate
      );

      const receipt = await tx.wait();
      tokenId = receipt.logs[0].topics[1];
    });

    it("Should return correct token URI", async function () {
      const tokenURI = await nftCredential.tokenURI(tokenId);
      expect(tokenURI).to.include("data:application/json");
      expect(tokenURI).to.include("Test Credential");
    });

    it("Should return correct credential info", async function () {
      const info = await nftCredential.getCredentialInfo(tokenId);

      expect(info.credentialType).to.equal("Test Credential");
      expect(info.issuer).to.equal(issuer1.address);
      expect(info.isRevoked).to.be.false;
      expect(info.trustScore).to.be.gt(0);
    });

    it("Should return credentials by owner", async function () {
      const credentials = await nftCredential.getCredentialsByOwner(recipient1.address);
      expect(credentials.length).to.equal(1);
      expect(credentials[0]).to.equal(tokenId);
    });

    it("Should return credentials by issuer", async function () {
      const credentials = await nftCredential.getCredentialsByIssuer(issuer1.address);
      expect(credentials.length).to.equal(1);
      expect(credentials[0]).to.equal(tokenId);
    });

    it("Should return authorized issuers", async function () {
      const issuers = await nftCredential.getAuthorizedIssuers();
      expect(issuers.length).to.equal(2);
      expect(issuers).to.include(issuer1.address);
      expect(issuers).to.include(issuer2.address);
    });
  });
});

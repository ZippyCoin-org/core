// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./TrustEngine.sol";

/**
 * @title ZippyCoin NFT Credentials
 * @dev Simplified NFT-based digital credentials with trust verification
 */
contract NFTCredential is ERC721, Ownable {
    using Counters for Counters.Counter;

    // Trust Engine integration
    TrustEngine public trustEngine;
    
    // Credential state
    Counters.Counter private _tokenIds;
    mapping(uint256 => string) public credentialTypes;
    mapping(uint256 => uint256) public issuanceDates;
    mapping(uint256 => uint256) public expirationDates;
    mapping(uint256 => bool) public isRevoked;
    mapping(uint256 => address) public issuers;
    mapping(uint256 => uint256) public trustScores;
    
    // Issuer management
    mapping(address => bool) public authorizedIssuers;
    mapping(address => uint256) public issuerTrustScores;
    
    // Events
    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed recipient,
        string credentialType,
        uint256 trustScore,
        uint256 expirationDate
    );
    event CredentialRevoked(uint256 indexed tokenId, address indexed issuer);
    event IssuerAuthorized(address indexed issuer, uint256 trustScore);
    event IssuerRevoked(address indexed issuer);

    constructor(address _trustEngine) ERC721("ZippyCoin Credentials", "ZPC-CRED") {
        trustEngine = TrustEngine(_trustEngine);
    }

    /**
     * @dev Issue a new credential
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        uint256 expirationDate
    ) external {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(credentialType).length > 0, "Invalid credential type");
        require(expirationDate > block.timestamp, "Invalid expiration date");
        
        uint256 issuerTrustScore = trustEngine.getTrustScoreValue(msg.sender);
        require(issuerTrustScore >= 50, "Insufficient issuer trust score");
        
        uint256 recipientTrustScore = trustEngine.getTrustScoreValue(recipient);
        require(recipientTrustScore >= 20, "Insufficient recipient trust score");
        
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        _mint(recipient, tokenId);
        
        credentialTypes[tokenId] = credentialType;
        issuanceDates[tokenId] = block.timestamp;
        expirationDates[tokenId] = expirationDate;
        issuers[tokenId] = msg.sender;
        trustScores[tokenId] = recipientTrustScore;
        
        emit CredentialIssued(tokenId, recipient, credentialType, recipientTrustScore, expirationDate);
    }

    /**
     * @dev Revoke a credential
     */
    function revokeCredential(uint256 tokenId) external {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        require(_exists(tokenId), "Credential does not exist");
        require(!isRevoked[tokenId], "Credential already revoked");
        require(issuers[tokenId] == msg.sender, "Not the issuer");
        
        isRevoked[tokenId] = true;
        
        emit CredentialRevoked(tokenId, msg.sender);
    }

    /**
     * @dev Authorize an issuer
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        require(issuer != address(0), "Invalid issuer");
        require(!authorizedIssuers[issuer], "Already authorized");
        
        uint256 trustScore = trustEngine.getTrustScoreValue(issuer);
        require(trustScore >= 50, "Insufficient trust score");
        
        authorizedIssuers[issuer] = true;
        issuerTrustScores[issuer] = trustScore;
        
        emit IssuerAuthorized(issuer, trustScore);
    }

    /**
     * @dev Revoke issuer authorization
     */
    function revokeIssuer(address issuer) external onlyOwner {
        require(authorizedIssuers[issuer], "Not an authorized issuer");
        
        authorizedIssuers[issuer] = false;
        issuerTrustScores[issuer] = 0;
        
        emit IssuerRevoked(issuer);
    }

    /**
     * @dev Get credential details
     */
    function getCredential(uint256 tokenId) external view returns (
        address owner,
        string memory credentialType,
        uint256 issuanceDate,
        uint256 expirationDate,
        bool revoked,
        address issuer,
        uint256 trustScore
    ) {
        require(_exists(tokenId), "Credential does not exist");
        
        owner = ownerOf(tokenId);
        credentialType = credentialTypes[tokenId];
        issuanceDate = issuanceDates[tokenId];
        expirationDate = expirationDates[tokenId];
        revoked = isRevoked[tokenId];
        issuer = issuers[tokenId];
        trustScore = trustScores[tokenId];
    }

    /**
     * @dev Check if credential is valid
     */
    function isCredentialValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        if (isRevoked[tokenId]) return false;
        if (block.timestamp > expirationDates[tokenId]) return false;
        return true;
    }

    /**
     * @dev Get total number of credentials
     */
    function totalCredentials() external view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Check if address is an authorized issuer
     */
    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer];
    }

    /**
     * @dev Get issuer trust score
     */
    function getIssuerTrustScore(address issuer) external view returns (uint256) {
        return issuerTrustScores[issuer];
    }

    /**
     * @dev Override transfer function to prevent transfers
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        revert("Credentials are non-transferable");
    }

    /**
     * @dev Override approve function to prevent approvals
     */
    function approve(address to, uint256 tokenId) public virtual override {
        revert("Credentials are non-transferable");
    }

    /**
     * @dev Override setApprovalForAll function to prevent approvals
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        revert("Credentials are non-transferable");
    }
} 
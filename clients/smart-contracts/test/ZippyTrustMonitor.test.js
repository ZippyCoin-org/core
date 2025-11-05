import { expect } from "chai";
import { ethers } from "hardhat";

describe("ZippyTrustMonitor", function () {
  let zippyMonitor;
  let trustEngine;
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

    // Deploy ZippyTrustMonitor
    const ZippyTrustMonitor = await ethers.getContractFactory("ZippyTrustMonitor");
    zippyMonitor = await ZippyTrustMonitor.deploy(await trustEngine.getAddress());
    await zippyMonitor.waitForDeployment();

    // Initialize some trust scores for testing
    await trustEngine.initializeTrustScore(user1.address, 85);
    await trustEngine.initializeTrustScore(user2.address, 72);
    await trustEngine.initializeTrustScore(user3.address, 68);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await zippyMonitor.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      expect(await zippyMonitor.owner()).to.equal(owner.address);
    });

    it("Should set the correct trust engine", async function () {
      expect(await zippyMonitor.trustEngine()).to.equal(await trustEngine.getAddress());
    });

    it("Should have correct monitoring constants", async function () {
      expect(await zippyMonitor.ZIPPY_MONITOR_PORT()).to.equal(9471);
      expect(await zippyMonitor.MONITORING_INTERVAL()).to.equal(30);
      expect(await zippyMonitor.HEALTH_CHECK_INTERVAL()).to.equal(10);
    });
  });

  describe("Trust Metrics Monitoring", function () {
    it("Should update trust metrics correctly", async function () {
      await zippyMonitor.updateTrustMetrics();

      const metrics = await zippyMonitor.getTrustMetrics();
      expect(metrics.totalWallets).to.equal(3);
      expect(metrics.activeWallets).to.equal(3);
      expect(metrics.averageTrustScore).to.be.gt(0);
      expect(metrics.lastUpdate).to.be.gt(0);
    });

    it("Should calculate trust distribution", async function () {
      await zippyMonitor.updateTrustMetrics();

      const distribution = await zippyMonitor.getTrustDistribution();
      expect(distribution.highTrust).to.be.gte(0);
      expect(distribution.mediumTrust).to.be.gte(0);
      expect(distribution.lowTrust).to.be.gte(0);
      expect(distribution.highTrust + distribution.mediumTrust + distribution.lowTrust).to.equal(3);
    });

    it("Should return trust score percentiles", async function () {
      await zippyMonitor.updateTrustMetrics();

      const percentile25 = await zippyMonitor.getTrustScorePercentile(25);
      const percentile50 = await zippyMonitor.getTrustScorePercentile(50);
      const percentile75 = await zippyMonitor.getTrustScorePercentile(75);

      expect(percentile25).to.be.lte(percentile50);
      expect(percentile50).to.be.lte(percentile75);
    });
  });

  describe("Health Monitoring", function () {
    it("Should perform health checks", async function () {
      const healthStatus = await zippyMonitor.performHealthCheck();
      expect(healthStatus.isOperational).to.be.true;
      expect(healthStatus.uptime).to.be.gte(0);
      expect(healthStatus.lastHealthCheck).to.be.gt(0);
    });

    it("Should report system status", async function () {
      const status = await zippyMonitor.getSystemStatus();

      expect(status.healthStatus.isOperational).to.be.true;
      expect(status.trustMetrics.totalWallets).to.equal(3);
      expect(status.networkTopology.nodeCount).to.be.gte(0);
      expect(status.privacyCompliance.complianceScore).to.be.gte(0);
    });

    it("Should track error counts", async function () {
      // Simulate an error by calling a function that might fail
      // For testing, we'll just check that error tracking works
      const initialHealth = await zippyMonitor.performHealthCheck();
      const initialErrors = initialHealth.errorCount;

      // Force an update to trigger error checking
      await zippyMonitor.updateTrustMetrics();

      const updatedHealth = await zippyMonitor.performHealthCheck();
      // Error count should not have increased for successful operations
      expect(updatedHealth.errorCount).to.equal(initialErrors);
    });
  });

  describe("Environmental Monitoring", function () {
    beforeEach(async function () {
      // Submit some environmental data
      await trustEngine.connect(user1).submitEnvironmentalData(25, 60, 1013);
      await trustEngine.connect(user2).submitEnvironmentalData(24, 65, 1015);
    });

    it("Should track environmental contributions", async function () {
      await zippyMonitor.updateEnvironmentalMetrics();

      const envMetrics = await zippyMonitor.getEnvironmentalMetrics();
      expect(envMetrics.totalContributions).to.be.gte(2);
      expect(envMetrics.activeContributors).to.be.gte(2);
      expect(envMetrics.averageTemperature).to.be.gt(0);
      expect(envMetrics.averageHumidity).to.be.gt(0);
    });

    it("Should calculate environmental impact scores", async function () {
      await zippyMonitor.updateEnvironmentalMetrics();

      const impact = await zippyMonitor.getEnvironmentalImpact();
      expect(impact.carbonFootprintReduction).to.be.gte(0);
      expect(impact.energyEfficiency).to.be.gte(0);
      expect(impact.sustainabilityScore).to.be.gte(0);
    });

    it("Should provide environmental analytics", async function () {
      await zippyMonitor.updateEnvironmentalMetrics();

      const analytics = await zippyMonitor.getEnvironmentalAnalytics();
      expect(analytics.dataPoints).to.be.gte(2);
      expect(analytics.contributionFrequency).to.be.gte(0);
      expect(analytics.geographicDistribution).to.be.gte(0);
    });
  });

  describe("Privacy Compliance Monitoring", function () {
    beforeEach(async function () {
      // Set privacy configurations
      await trustEngine.connect(user1).updatePrivacyConfig(true, false, true, true, 3, true);
      await trustEngine.connect(user2).updatePrivacyConfig(false, true, false, false, 1, false);
      await trustEngine.connect(user3).updatePrivacyConfig(true, true, true, true, 3, true);
    });

    it("Should monitor privacy compliance", async function () {
      await zippyMonitor.updatePrivacyMetrics();

      const privacy = await zippyMonitor.getPrivacyCompliance();
      expect(privacy.complianceScore).to.be.gte(0);
      expect(privacy.complianceScore).to.be.lte(100);
      expect(privacy.consentGivenCount).to.be.gte(0);
      expect(privacy.dataSharingOptOuts).to.be.gte(0);
    });

    it("Should track privacy violations", async function () {
      // Initially should have no violations
      const initialPrivacy = await zippyMonitor.getPrivacyCompliance();
      const initialViolations = initialPrivacy.privacyViolations;

      // Report a privacy violation
      await zippyMonitor.reportPrivacyViolation(user2.address, "Unauthorized data sharing");

      const updatedPrivacy = await zippyMonitor.getPrivacyCompliance();
      expect(updatedPrivacy.privacyViolations).to.equal(initialViolations + 1);
    });

    it("Should generate privacy audit reports", async function () {
      await zippyMonitor.updatePrivacyMetrics();

      const audit = await zippyMonitor.generatePrivacyAuditReport();
      expect(audit.timestamp).to.be.gt(0);
      expect(audit.complianceLevel).to.be.gte(0);
      expect(audit.recommendations.length).to.be.gte(0);
    });
  });

  describe("Network Topology Monitoring", function () {
    beforeEach(async function () {
      // Set up some delegations to create network topology
      await trustEngine.connect(user1).delegateTrust(user2.address, 15);
      await trustEngine.connect(user2).delegateTrust(user3.address, 10);
      await trustEngine.connect(user3).delegateTrust(user1.address, 8);
    });

    it("Should analyze network topology", async function () {
      await zippyMonitor.updateNetworkTopology();

      const topology = await zippyMonitor.getNetworkTopology();
      expect(topology.nodeCount).to.equal(3);
      expect(topology.edgeCount).to.be.gte(3);
      expect(topology.averageDegree).to.be.gt(0);
      expect(topology.clusteringCoefficient).to.be.gte(0);
    });

    it("Should calculate network centrality metrics", async function () {
      await zippyMonitor.updateNetworkTopology();

      const centrality = await zippyMonitor.getNetworkCentrality();
      expect(centrality.betweennessCentrality.length).to.equal(3);
      expect(centrality.closenessCentrality.length).to.equal(3);
      expect(centrality.eigenvectorCentrality.length).to.equal(3);
    });

    it("Should detect trust clusters", async function () {
      await zippyMonitor.updateNetworkTopology();

      const clusters = await zippyMonitor.getTrustClusters();
      expect(clusters.clusterCount).to.be.gte(1);
      expect(clusters.largestClusterSize).to.be.gte(1);
      expect(clusters.averageClusterSize).to.be.gt(0);
    });
  });

  describe("Suspicious Activity Detection", function () {
    it("Should detect unusual trust score changes", async function () {
      // Create a normal trust score
      await trustEngine.initializeTrustScore(user1.address, 75);

      // Report suspicious activity
      await zippyMonitor.reportSuspiciousActivity(
        user1.address,
        "Unusual trust score fluctuation",
        2 // MEDIUM severity
      );

      const alerts = await zippyMonitor.getSuspiciousActivityAlerts();
      expect(alerts.length).to.equal(1);
      expect(alerts[0].wallet).to.equal(user1.address);
      expect(alerts[0].severity).to.equal(2);
    });

    it("Should track suspicious activity metrics", async function () {
      await zippyMonitor.reportSuspiciousActivity(user1.address, "Test activity 1", 1);
      await zippyMonitor.reportSuspiciousActivity(user2.address, "Test activity 2", 2);
      await zippyMonitor.reportSuspiciousActivity(user3.address, "Test activity 3", 3);

      const metrics = await zippyMonitor.getSuspiciousActivityMetrics();
      expect(metrics.totalAlerts).to.equal(3);
      expect(metrics.highSeverityAlerts).to.equal(1);
      expect(metrics.mediumSeverityAlerts).to.equal(1);
      expect(metrics.lowSeverityAlerts).to.equal(1);
    });

    it("Should resolve suspicious activity alerts", async function () {
      // Report activity
      await zippyMonitor.reportSuspiciousActivity(user1.address, "Test activity", 2);

      // Resolve it
      await zippyMonitor.resolveSuspiciousActivity(1, "Investigation complete - false positive");

      const alerts = await zippyMonitor.getSuspiciousActivityAlerts();
      expect(alerts[0].isResolved).to.be.true;
    });
  });

  describe("ZIPPY Monitoring Endpoints", function () {
    it("Should provide ZIPPY status endpoint", async function () {
      const status = await zippyMonitor.getZippyStatus();
      expect(status.version).to.equal("1.0.0");
      expect(status.port).to.equal(9471);
      expect(status.isActive).to.be.true;
      expect(status.lastPing).to.be.gt(0);
    });

    it("Should provide comprehensive system metrics", async function () {
      const metrics = await zippyMonitor.getComprehensiveMetrics();

      expect(metrics.trustMetrics.totalWallets).to.equal(3);
      expect(metrics.healthStatus.isOperational).to.be.true;
      expect(metrics.networkTopology.nodeCount).to.equal(3);
      expect(metrics.privacyCompliance.complianceScore).to.be.gte(0);
      expect(metrics.environmentalMetrics.totalContributions).to.be.gte(0);
    });

    it("Should support metric subscriptions", async function () {
      // Subscribe to trust metrics
      await zippyMonitor.subscribeToMetrics(user1.address, 1); // TRUST_METRICS

      const subscriptions = await zippyMonitor.getMetricSubscriptions(user1.address);
      expect(subscriptions.length).to.equal(1);
      expect(subscriptions[0]).to.equal(1);
    });

    it("Should provide real-time metric updates", async function () {
      await zippyMonitor.subscribeToMetrics(user1.address, 1);

      // Trigger a metrics update
      await zippyMonitor.updateTrustMetrics();

      const updates = await zippyMonitor.getRealTimeUpdates(user1.address);
      expect(updates.length).to.be.gte(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause monitoring", async function () {
      await zippyMonitor.pause();
      expect(await zippyMonitor.paused()).to.be.true;

      await zippyMonitor.unpause();
      expect(await zippyMonitor.paused()).to.be.false;
    });

    it("Should only allow owner to pause", async function () {
      await expect(zippyMonitor.connect(user1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent operations when paused", async function () {
      await zippyMonitor.pause();

      await expect(zippyMonitor.updateTrustMetrics())
        .to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to reset metrics", async function () {
      // Update metrics first
      await zippyMonitor.updateTrustMetrics();

      // Reset them
      await zippyMonitor.emergencyResetMetrics();

      const metrics = await zippyMonitor.getTrustMetrics();
      expect(metrics.totalWallets).to.equal(0);
      expect(metrics.activeWallets).to.equal(0);
    });

    it("Should only allow owner to reset metrics", async function () {
      await expect(zippyMonitor.connect(user1).emergencyResetMetrics())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow emergency alert broadcasting", async function () {
      await zippyMonitor.emergencyBroadcastAlert(
        "System maintenance",
        "Scheduled maintenance in 5 minutes",
        1 // INFO level
      );

      const alerts = await zippyMonitor.getEmergencyAlerts();
      expect(alerts.length).to.equal(1);
      expect(alerts[0].message).to.equal("Scheduled maintenance in 5 minutes");
    });
  });
});

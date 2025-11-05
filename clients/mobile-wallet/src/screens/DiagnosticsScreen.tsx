import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NetworkService } from '../services/NetworkService';
import { WalletService } from '../services/WalletService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Diagnostics: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type DiagnosticsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Diagnostics'
>;

type DiagnosticsScreenRouteProp = RouteProp<
  RootStackParamList,
  'Diagnostics'
>;

interface Props {
  navigation: DiagnosticsScreenNavigationProp;
  route: DiagnosticsScreenRouteProp;
}

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'running';
  message: string;
  details?: any;
  timestamp: number;
}

export const DiagnosticsScreen: React.FC<Props> = ({ navigation }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [networkService] = useState(() => new NetworkService());
  const [walletService] = useState(() => new WalletService());

  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        runDiagnostics();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Network Connectivity Test
      diagnosticResults.push(await testNetworkConnectivity());

      // Wallet Service Test
      diagnosticResults.push(await testWalletService());

      // Trust Engine Test
      diagnosticResults.push(await testTrustEngine());

      // Node Service Test
      diagnosticResults.push(await testNodeService());

      // API Gateway Test
      diagnosticResults.push(await testApiGateway());

      // Local Storage Test
      diagnosticResults.push(await testLocalStorage());

      // Device Security Test
      diagnosticResults.push(await testDeviceSecurity());

      setResults(diagnosticResults);
    } catch (error) {
      logger.error('Failed to run diagnostics', { error: error.message });
      Alert.alert('Error', 'Failed to run diagnostics');
    } finally {
      setIsRunning(false);
    }
  };

  const testNetworkConnectivity = async (): Promise<DiagnosticResult> => {
    try {
      const startTime = Date.now();
      // Test basic internet connectivity
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
      });
      const latency = Date.now() - startTime;

      return {
        name: 'Network Connectivity',
        status: response.ok ? 'pass' : 'fail',
        message: response.ok ? `Connected (${latency}ms)` : 'No internet connection',
        details: { latency, status: response.status },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'fail',
        message: 'Network test failed',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testWalletService = async (): Promise<DiagnosticResult> => {
    try {
      const health = await networkService.getHealthStatus();
      const walletHealth = health.walletService === 'healthy';

      return {
        name: 'Wallet Service',
        status: walletHealth ? 'pass' : 'fail',
        message: walletHealth ? 'Wallet service is healthy' : 'Wallet service is unhealthy',
        details: health,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Wallet Service',
        status: 'fail',
        message: 'Failed to connect to wallet service',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testTrustEngine = async (): Promise<DiagnosticResult> => {
    try {
      const health = await networkService.getHealthStatus();
      const trustHealth = health.trustEngine === 'healthy';

      return {
        name: 'Trust Engine',
        status: trustHealth ? 'pass' : 'fail',
        message: trustHealth ? 'Trust engine is healthy' : 'Trust engine is unhealthy',
        details: health,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Trust Engine',
        status: 'fail',
        message: 'Failed to connect to trust engine',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testNodeService = async (): Promise<DiagnosticResult> => {
    try {
      const health = await networkService.getHealthStatus();
      const nodeHealth = health.nodeService === 'healthy';

      return {
        name: 'Node Service',
        status: nodeHealth ? 'pass' : 'fail',
        message: nodeHealth ? 'Node service is healthy' : 'Node service is unhealthy',
        details: health,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Node Service',
        status: 'fail',
        message: 'Failed to connect to node service',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testApiGateway = async (): Promise<DiagnosticResult> => {
    try {
      const health = await networkService.getHealthStatus();
      const gatewayHealth = health.apiGateway === 'healthy';

      return {
        name: 'API Gateway',
        status: gatewayHealth ? 'pass' : 'fail',
        message: gatewayHealth ? 'API gateway is healthy' : 'API gateway is unhealthy',
        details: health,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'API Gateway',
        status: 'fail',
        message: 'Failed to connect to API gateway',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testLocalStorage = async (): Promise<DiagnosticResult> => {
    try {
      // Test local storage functionality
      const testKey = 'diagnostic_test';
      const testValue = { test: 'data', timestamp: Date.now() };

      await walletService.storageService?.saveData(testKey, testValue);
      const retrieved = await walletService.storageService?.getData(testKey);

      const success = retrieved && retrieved.test === testValue.test;

      // Clean up
      await walletService.storageService?.deleteData(testKey);

      return {
        name: 'Local Storage',
        status: success ? 'pass' : 'fail',
        message: success ? 'Local storage is working' : 'Local storage test failed',
        details: { success },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'fail',
        message: 'Local storage test failed',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const testDeviceSecurity = async (): Promise<DiagnosticResult> => {
    try {
      // Test device security features
      const securityInfo = {
        hasBiometric: false, // Would check actual biometric availability
        hasSecureStorage: true, // Assume secure storage is available
        isJailbroken: false, // Would check for jailbreak/root detection
        hasEncryption: true, // Assume encryption is available
      };

      const issues = [];
      if (!securityInfo.hasBiometric) issues.push('No biometric authentication');
      if (!securityInfo.hasSecureStorage) issues.push('No secure storage');
      if (securityInfo.isJailbroken) issues.push('Device may be compromised');

      const status = issues.length === 0 ? 'pass' : issues.length > 2 ? 'fail' : 'warning';

      return {
        name: 'Device Security',
        status,
        message: issues.length === 0 ? 'Device security is good' : `Security concerns: ${issues.join(', ')}`,
        details: { securityInfo, issues },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Device Security',
        status: 'fail',
        message: 'Device security test failed',
        details: { error: error.message },
        timestamp: Date.now(),
      };
    }
  };

  const handleClearResults = () => {
    Alert.alert(
      'Clear Results',
      'Are you sure you want to clear all diagnostic results?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => setResults([]),
        },
      ]
    );
  };

  const handleExportResults = () => {
    // In a real implementation, you would export results to file or share
    Alert.alert('Export', 'Diagnostic results exported (functionality would be implemented here)');
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '#00FF88';
      case 'fail':
        return '#FF4444';
      case 'warning':
        return '#FFAA00';
      case 'running':
        return '#888888';
      default:
        return '#888888';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'running':
        return '⏳';
      default:
        return '❓';
    }
  };

  const renderResultItem = (result: DiagnosticResult) => {
    return (
      <View key={result.name} style={styles.resultItem}>
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleContainer}>
            <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
            <Text style={styles.resultName}>{result.name}</Text>
          </View>
          <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
            {result.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.resultMessage}>{result.message}</Text>

        {result.details && (
          <View style={styles.resultDetails}>
            <Text style={styles.detailsText}>
              {JSON.stringify(result.details, null, 2)}
            </Text>
          </View>
        )}

        <Text style={styles.resultTimestamp}>
          {new Date(result.timestamp).toLocaleString()}
        </Text>
      </View>
    );
  };

  const getOverallStatus = () => {
    if (results.length === 0) return 'unknown';
    if (results.some(r => r.status === 'fail')) return 'fail';
    if (results.some(r => r.status === 'warning')) return 'warning';
    if (results.every(r => r.status === 'pass')) return 'pass';
    return 'running';
  };

  const overallStatus = getOverallStatus();
  const passedTests = results.filter(r => r.status === 'pass').length;
  const totalTests = results.length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>System Diagnostics</Text>
        <Text style={styles.subtitle}>
          Check the health and status of all ZippyCoin services
        </Text>
      </View>

      <View style={styles.statusOverview}>
        <View style={styles.statusIndicator}>
          <Text style={styles.statusIcon}>{getStatusIcon(overallStatus)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(overallStatus) }]}>
            {overallStatus.toUpperCase()}
          </Text>
        </View>

        <View style={styles.statusStats}>
          <Text style={styles.statsText}>
            {passedTests}/{totalTests} tests passed
          </Text>
          <Text style={styles.lastRunText}>
            Last run: {results.length > 0 ? new Date(Math.max(...results.map(r => r.timestamp))).toLocaleTimeString() : 'Never'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.runButton]}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.runButtonText}>Run Diagnostics</Text>
          )}
        </TouchableOpacity>

        <View style={styles.controlOptions}>
          <View style={styles.autoRefresh}>
            <Text style={styles.autoRefreshLabel}>Auto-refresh</Text>
            <Switch
              value={autoRefresh}
              onValueChange={setAutoRefresh}
              trackColor={{ false: '#333333', true: '#00FF88' }}
              thumbColor={autoRefresh ? '#000000' : '#FFFFFF'}
            />
          </View>

          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleClearResults}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={handleExportResults}
          >
            <Text style={styles.secondaryButtonText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.results}>
        {results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No diagnostic results</Text>
            <Text style={styles.emptyStateSubtext}>
              Run diagnostics to check system health
            </Text>
          </View>
        ) : (
          results.map(renderResultItem)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  statusOverview: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    alignItems: 'center',
    marginRight: 20,
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusStats: {
    flex: 1,
  },
  statsText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lastRunText: {
    fontSize: 12,
    color: '#888888',
  },
  controls: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  controlButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  runButton: {
    backgroundColor: '#00FF88',
  },
  runButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRefreshLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 10,
  },
  secondaryButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  results: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultMessage: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 10,
    lineHeight: 20,
  },
  resultDetails: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'monospace',
  },
  resultTimestamp: {
    fontSize: 12,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
});

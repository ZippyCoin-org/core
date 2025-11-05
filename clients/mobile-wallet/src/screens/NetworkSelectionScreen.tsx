import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NetworkService } from '../services/NetworkService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  NetworkSelection: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type NetworkSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NetworkSelection'
>;

type NetworkSelectionScreenRouteProp = RouteProp<
  RootStackParamList,
  'NetworkSelection'
>;

interface Props {
  navigation: NetworkSelectionScreenNavigationProp;
  route: NetworkSelectionScreenRouteProp;
}

interface Network {
  id: string;
  name: string;
  type: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl: string;
  chainId: number;
  symbol: string;
  blockTime: number;
  status: 'online' | 'offline' | 'syncing';
  latency?: number;
}

export const NetworkSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [networkService] = useState(() => new NetworkService());

  const defaultNetworks: Network[] = [
    {
      id: 'zippycoin-mainnet',
      name: 'ZippyCoin Mainnet',
      type: 'mainnet',
      rpcUrl: 'https://rpc.zippycoin.org',
      chainId: 1,
      symbol: 'ZPC',
      blockTime: 2000, // 2 seconds
      status: 'online',
    },
    {
      id: 'zippycoin-testnet',
      name: 'ZippyCoin Testnet',
      type: 'testnet',
      rpcUrl: 'https://rpc-testnet.zippycoin.org',
      chainId: 2,
      symbol: 'ZPC',
      blockTime: 2000,
      status: 'online',
    },
    {
      id: 'zippycoin-devnet',
      name: 'ZippyCoin Devnet',
      type: 'devnet',
      rpcUrl: 'http://localhost:8545',
      chainId: 1337,
      symbol: 'ZPC',
      blockTime: 2000,
      status: 'offline',
    },
  ];

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, you would fetch network list from a service
      // For now, we'll use the default networks
      setNetworks(defaultNetworks);

      // Test connection to each network
      await testNetworkConnections();
    } catch (error) {
      logger.error('Failed to load networks', { error: error.message });
      Alert.alert('Error', 'Failed to load network list');
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkConnections = async () => {
    setIsTestingConnection(true);
    try {
      const updatedNetworks = await Promise.all(
        networks.map(async (network) => {
          try {
            // Test connection by making a simple RPC call
            const startTime = Date.now();
            await networkService.rpcCall('getblockcount');
            const latency = Date.now() - startTime;

            return {
              ...network,
              status: 'online' as const,
              latency,
            };
          } catch (error) {
            return {
              ...network,
              status: 'offline' as const,
            };
          }
        })
      );

      setNetworks(updatedNetworks);
    } catch (error) {
      logger.error('Failed to test network connections', { error: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleNetworkSelect = async (network: Network) => {
    if (network.status === 'offline') {
      Alert.alert('Network Offline', 'This network is currently unavailable. Please try again later.');
      return;
    }

    try {
      setSelectedNetwork(network.id);

      // In a real implementation, you would switch the network in the wallet service
      // For now, we'll just show a success message
      Alert.alert(
        'Network Selected',
        `Switched to ${network.name}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to select network', { networkId: network.id, error: error.message });
      Alert.alert('Error', 'Failed to switch network');
      setSelectedNetwork('');
    }
  };

  const handleAddCustomNetwork = () => {
    // In a real implementation, you would navigate to an add network screen
    Alert.alert('Info', 'Add custom network functionality would be implemented here');
  };

  const handleRefreshNetworks = () => {
    testNetworkConnections();
  };

  const getStatusColor = (status: Network['status']) => {
    switch (status) {
      case 'online':
        return '#00FF88';
      case 'offline':
        return '#FF4444';
      case 'syncing':
        return '#FFAA00';
      default:
        return '#888888';
    }
  };

  const getStatusText = (status: Network['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'syncing':
        return 'Syncing';
      default:
        return 'Unknown';
    }
  };

  const renderNetworkItem = (network: Network) => {
    const isSelected = selectedNetwork === network.id;

    return (
      <TouchableOpacity
        key={network.id}
        style={[
          styles.networkItem,
          isSelected && styles.networkItemSelected,
        ]}
        onPress={() => handleNetworkSelect(network)}
        disabled={network.status === 'offline'}
      >
        <View style={styles.networkInfo}>
          <View style={styles.networkHeader}>
            <Text style={styles.networkName}>{network.name}</Text>
            <View style={styles.networkTypeContainer}>
              <Text style={[
                styles.networkType,
                { backgroundColor: network.type === 'mainnet' ? '#FF4444' : network.type === 'testnet' ? '#FFAA00' : '#888888' }
              ]}>
                {network.type.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.networkUrl}>{network.rpcUrl}</Text>

          <View style={styles.networkDetails}>
            <Text style={styles.networkDetail}>
              Chain ID: {network.chainId}
            </Text>
            <Text style={styles.networkDetail}>
              Symbol: {network.symbol}
            </Text>
            <Text style={styles.networkDetail}>
              Block Time: {(network.blockTime / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>

        <View style={styles.networkStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(network.status) }
          ]} />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(network.status) }
          ]}>
            {getStatusText(network.status)}
          </Text>
          {network.latency && (
            <Text style={styles.latencyText}>
              {network.latency}ms
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading networks...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Network</Text>
        <Text style={styles.subtitle}>
          Choose the blockchain network to connect to
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshNetworks}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <ActivityIndicator size="small" color="#00FF88" />
            ) : (
              <Text style={styles.refreshButtonText}>Refresh</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCustomNetwork}
          >
            <Text style={styles.addButtonText}>Add Network</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {networks.map(renderNetworkItem)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
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
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refreshButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  networkItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkItemSelected: {
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  networkInfo: {
    flex: 1,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  networkTypeContainer: {
    marginLeft: 10,
  },
  networkType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  networkUrl: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 10,
  },
  networkDetails: {
    flexDirection: 'row',
    gap: 15,
  },
  networkDetail: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  networkStatus: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  latencyText: {
    fontSize: 10,
    color: '#888888',
  },
});

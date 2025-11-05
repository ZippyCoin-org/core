/**
 * ZippyCoin Mobile Wallet - Main App Component
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import CreateWalletScreen from './screens/CreateWalletScreen';
import ImportWalletScreen from './screens/ImportWalletScreen';
import UnlockScreen from './screens/UnlockScreen';
import DashboardScreen from './screens/DashboardScreen';
import SendScreen from './screens/SendScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import TrustDashboardScreen from './screens/TrustDashboardScreen';
import DeFiScreen from './screens/DeFiScreen';
import SettingsScreen from './screens/SettingsScreen';

// Services
import { WalletService } from './services/WalletService';
import { TrustService } from './services/TrustService';
import { QuantumCryptoService } from './services/QuantumCryptoService';
import { EnvironmentalDataService } from './services/EnvironmentalDataService';
import { BiometricService } from './services/BiometricService';

// Components
import LoadingScreen from './components/LoadingScreen';
import TrustScoreWidget from './components/TrustScoreWidget';
import EnvironmentalDataWidget from './components/EnvironmentalDataWidget';

// Types
import { Wallet, TrustScore, EnvironmentalData } from './types/wallet';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Services
  const walletService = new WalletService();
  const trustService = new TrustService();
  const quantumCrypto = new QuantumCryptoService();
  const environmentalDataService = new EnvironmentalDataService();
  const biometricService = new BiometricService();

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize the app with wallet and trust services
   */
  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // Check if wallet exists
      const existingWallet = await walletService.getWallet();
      
      if (existingWallet) {
        setWallet(existingWallet);
        
        // Check biometric authentication
        const biometricAvailable = await biometricService.isBiometricAvailable();
        if (biometricAvailable) {
          const biometricEnabled = await SecureStore.getItemAsync('biometricEnabled') === 'true';
          setIsBiometricEnabled(biometricEnabled);
          
          if (biometricEnabled) {
            const authenticated = await biometricService.authenticate();
            if (!authenticated) {
              Alert.alert('Authentication Failed', 'Please authenticate to access your wallet');
              setIsLoading(false);
              return;
            }
          }
        }

        // Initialize trust score
        await initializeTrustScore(existingWallet.address);
        
        // Initialize environmental monitoring
        await initializeEnvironmentalMonitoring();
        
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Initialization Error', 'Failed to initialize wallet');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize trust score calculation
   */
  const initializeTrustScore = async (address: string) => {
    try {
      const trustData = await trustService.calculateTrustScore(address);
      setTrustScore(trustData);
      
      // Update trust score every 5 minutes
      setInterval(async () => {
        const updatedTrust = await trustService.calculateTrustScore(address);
        setTrustScore(updatedTrust);
      }, 300000);
    } catch (error) {
      console.error('Error initializing trust score:', error);
    }
  };

  /**
   * Initialize environmental monitoring
   */
  const initializeEnvironmentalMonitoring = async () => {
    try {
      // Start environmental monitoring
      environmentalDataService.startMonitoring();
      
      // Get initial environmental data
      const envData = await environmentalDataService.getCurrentData();
      setEnvironmentalData(envData);
      
      // Update environmental data every 30 seconds
      setInterval(async () => {
        const updatedEnvData = await environmentalDataService.getCurrentData();
        setEnvironmentalData(updatedEnvData);
      }, 30000);
    } catch (error) {
      console.error('Error initializing environmental monitoring:', error);
    }
  };

  /**
   * Create new wallet with quantum-resistant features
   */
  const createWallet = async (mnemonic?: string) => {
    try {
      setIsLoading(true);
      
      // Get environmental data for quantum-resistant key generation
      const envData = await environmentalDataService.getCurrentData();
      
      // Create wallet with quantum-resistant cryptography
      const newWallet = await walletService.createWallet(mnemonic, envData);
      setWallet(newWallet);
      
      // Initialize trust score for new wallet
      await initializeTrustScore(newWallet.address);
      
      // Initialize environmental monitoring
      await initializeEnvironmentalMonitoring();
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Wallet Creation Error', 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Import existing wallet
   */
  const importWallet = async (mnemonic: string) => {
    try {
      setIsLoading(true);
      
      // Get environmental data for verification
      const envData = await environmentalDataService.getCurrentData();
      
      // Import wallet with quantum-resistant verification
      const importedWallet = await walletService.importWallet(mnemonic, envData);
      setWallet(importedWallet);
      
      // Initialize trust score for imported wallet
      await initializeTrustScore(importedWallet.address);
      
      // Initialize environmental monitoring
      await initializeEnvironmentalMonitoring();
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Import Error', 'Failed to import wallet. Please check your mnemonic phrase.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unlock wallet with biometric or PIN
   */
  const unlockWallet = async (pin: string) => {
    try {
      setIsLoading(true);
      
      // Verify PIN with quantum-resistant verification
      const envData = await environmentalDataService.getCurrentData();
      const unlocked = await walletService.unlockWallet(pin, envData);
      
      if (unlocked) {
        setIsAuthenticated(true);
      } else {
        Alert.alert('Unlock Failed', 'Invalid PIN');
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      Alert.alert('Unlock Error', 'Failed to unlock wallet');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send transaction with trust-weighted features
   */
  const sendTransaction = async (toAddress: string, amount: number, fee?: number) => {
    try {
      if (!wallet) throw new Error('No wallet available');
      
      // Get trust-weighted fee discount
      const baseFee = fee || 0.001;
      const discountedFee = await trustService.getFeeDiscount(wallet.address, baseFee);
      
      // Get environmental data for quantum-resistant signature
      const envData = await environmentalDataService.getCurrentData();
      
      // Send transaction with quantum-resistant signature
      const transaction = await walletService.sendTransaction(
        toAddress, 
        amount, 
        discountedFee, 
        envData
      );
      
      // Update trust score after transaction
      const updatedTrust = await trustService.calculateTrustScore(wallet.address);
      setTrustScore(updatedTrust);
      
      return transaction;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };

  /**
   * Toggle biometric authentication
   */
  const toggleBiometric = async () => {
    try {
      const biometricAvailable = await biometricService.isBiometricAvailable();
      if (!biometricAvailable) {
        Alert.alert('Biometric Unavailable', 'Biometric authentication is not available on this device');
        return;
      }

      const authenticated = await biometricService.authenticate();
      if (authenticated) {
        const newValue = !isBiometricEnabled;
        await SecureStore.setItemAsync('biometricEnabled', newValue.toString());
        setIsBiometricEnabled(newValue);
      }
    } catch (error) {
      console.error('Error toggling biometric:', error);
      Alert.alert('Biometric Error', 'Failed to configure biometric authentication');
    }
  };

  /**
   * Get trust-weighted rate limits
   */
  const getRateLimits = async () => {
    if (!wallet) return { requestsPerMinute: 100, requestsPerHour: 1000 };
    
    try {
      return await trustService.getRateLimits(wallet.address);
    } catch (error) {
      console.error('Error getting rate limits:', error);
      return { requestsPerMinute: 100, requestsPerHour: 1000 };
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a1a1a',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!isAuthenticated ? (
            // Authentication screens
            <>
              <Stack.Screen 
                name="Welcome" 
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="CreateWallet" 
                component={CreateWalletScreen}
                options={{ title: 'Create Wallet' }}
              />
              <Stack.Screen 
                name="ImportWallet" 
                component={ImportWalletScreen}
                options={{ title: 'Import Wallet' }}
              />
              <Stack.Screen 
                name="Unlock" 
                component={UnlockScreen}
                options={{ title: 'Unlock Wallet' }}
              />
            </>
          ) : (
            // Main app screens
            <>
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ 
                  title: 'ZippyCoin Wallet',
                  headerRight: () => (
                    <View style={styles.headerWidgets}>
                      {trustScore && (
                        <TrustScoreWidget trustScore={trustScore} />
                      )}
                      {environmentalData && (
                        <EnvironmentalDataWidget environmentalData={environmentalData} />
                      )}
                    </View>
                  )
                }}
              />
              <Stack.Screen 
                name="Send" 
                component={SendScreen}
                options={{ title: 'Send ZippyCoin' }}
              />
              <Stack.Screen 
                name="Receive" 
                component={ReceiveScreen}
                options={{ title: 'Receive ZippyCoin' }}
              />
              <Stack.Screen 
                name="TransactionHistory" 
                component={TransactionHistoryScreen}
                options={{ title: 'Transaction History' }}
              />
              <Stack.Screen 
                name="TrustDashboard" 
                component={TrustDashboardScreen}
                options={{ title: 'Trust Dashboard' }}
              />
              <Stack.Screen 
                name="DeFi" 
                component={DeFiScreen}
                options={{ title: 'DeFi Protocol' }}
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerWidgets: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
}); 
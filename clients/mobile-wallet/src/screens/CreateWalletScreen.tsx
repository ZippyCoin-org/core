import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { QuantumWalletManager } from '../wallet/QuantumWalletManager';

interface CreateWalletScreenProps {
  navigation: any;
}

export default function CreateWalletScreen({ navigation }: CreateWalletScreenProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [confirmedMnemonic, setConfirmedMnemonic] = useState(false);

  const walletManager = new QuantumWalletManager();

  const createWallet = async () => {
    try {
      setIsCreating(true);
      
      // Create quantum-resistant wallet
      const wallet = await walletManager.createQuantumWallet();
      
      // Generate mnemonic (in production, this would be from the wallet)
      const mockMnemonic = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actual', 'adapt'
      ];
      setMnemonic(mockMnemonic);
      
      // Store wallet securely
      await SecureStore.setItemAsync('wallet', JSON.stringify(wallet));
      await SecureStore.setItemAsync('mnemonic', mockMnemonic.join(' '));
      
      setShowMnemonic(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
      console.error('Error creating wallet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const confirmMnemonic = () => {
    setConfirmedMnemonic(true);
    Alert.alert(
      'Wallet Created!',
      'Your quantum-resistant wallet has been created successfully. Please keep your recovery phrase safe.',
      [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('Dashboard')
        }
      ]
    );
  };

  const renderMnemonicWords = () => {
    return (
      <View style={styles.mnemonicContainer}>
        <Text style={styles.mnemonicTitle}>Recovery Phrase</Text>
        <Text style={styles.mnemonicSubtitle}>
          Write down these 24 words in order and keep them safe. You'll need them to recover your wallet.
        </Text>
        
        <View style={styles.mnemonicGrid}>
          {mnemonic.map((word, index) => (
            <View key={index} style={styles.mnemonicWord}>
              <Text style={styles.wordNumber}>{index + 1}.</Text>
              <Text style={styles.wordText}>{word}</Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={confirmMnemonic}
        >
          <Text style={styles.confirmButtonText}>I've Written Down My Recovery Phrase</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreateWallet = () => {
    return (
      <View style={styles.createContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Wallet</Text>
          <Text style={styles.subtitle}>
            Generate a new quantum-resistant ZippyCoin wallet
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔐</Text>
            <Text style={styles.featureText}>Quantum-Resistant Security</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🌍</Text>
            <Text style={styles.featureText}>Environmental Data Integration</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🤝</Text>
            <Text style={styles.featureText}>Trust-Based Consensus</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={createWallet}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.createButtonText}>Create Quantum Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {showMnemonic ? renderMnemonicWords() : renderCreateWallet()}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  createContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  features: {
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  createButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  mnemonicContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mnemonicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  mnemonicSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  mnemonicWord: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
  },
  wordNumber: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: 8,
    minWidth: 20,
  },
  wordText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
}); 
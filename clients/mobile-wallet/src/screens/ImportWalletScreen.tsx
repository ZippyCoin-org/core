import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { QuantumWalletManager } from '../wallet/QuantumWalletManager';

interface ImportWalletScreenProps {
  navigation: any;
}

export default function ImportWalletScreen({ navigation }: ImportWalletScreenProps) {
  const [mnemonic, setMnemonic] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isValidMnemonic, setIsValidMnemonic] = useState(false);

  const walletManager = new QuantumWalletManager();

  const validateMnemonic = (phrase: string) => {
    const words = phrase.trim().split(/\s+/);
    // Basic validation - should have 12, 15, 18, 21, or 24 words
    const validLengths = [12, 15, 18, 21, 24];
    const isValid = validLengths.includes(words.length) && words.every(word => word.length > 0);
    setIsValidMnemonic(isValid);
    return isValid;
  };

  const handleMnemonicChange = (text: string) => {
    setMnemonic(text);
    validateMnemonic(text);
  };

  const importWallet = async () => {
    if (!isValidMnemonic) {
      Alert.alert('Invalid Recovery Phrase', 'Please enter a valid 12, 15, 18, 21, or 24 word recovery phrase.');
      return;
    }

    try {
      setIsImporting(true);
      
      // Import wallet from mnemonic
      const wallet = await walletManager.importQuantumWallet(mnemonic.trim());
      
      // Store wallet securely
      await SecureStore.setItemAsync('wallet', JSON.stringify(wallet));
      await SecureStore.setItemAsync('mnemonic', mnemonic.trim());
      
      Alert.alert(
        'Wallet Imported!',
        'Your quantum-resistant wallet has been imported successfully.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('Dashboard')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Import Failed', 'Failed to import wallet. Please check your recovery phrase and try again.');
      console.error('Error importing wallet:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const renderMnemonicInput = () => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Recovery Phrase</Text>
        <Text style={styles.inputSubtitle}>
          Enter your 12, 15, 18, 21, or 24 word recovery phrase
        </Text>
        
        <TextInput
          style={[
            styles.mnemonicInput,
            isValidMnemonic && mnemonic.length > 0 && styles.validInput,
            !isValidMnemonic && mnemonic.length > 0 && styles.invalidInput
          ]}
          value={mnemonic}
          onChangeText={handleMnemonicChange}
          placeholder="Enter your recovery phrase here..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        
        {mnemonic.length > 0 && (
          <Text style={[
            styles.validationText,
            isValidMnemonic ? styles.validText : styles.invalidText
          ]}>
            {isValidMnemonic ? '✓ Valid recovery phrase' : '✗ Invalid recovery phrase'}
          </Text>
        )}
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
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Import Wallet</Text>
              <Text style={styles.subtitle}>
                Import your existing quantum-resistant ZippyCoin wallet
              </Text>
            </View>

            {renderMnemonicInput()}

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
              style={[
                styles.importButton,
                (!isValidMnemonic || isImporting) && styles.importButtonDisabled
              ]}
              onPress={importWallet}
              disabled={!isValidMnemonic || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.importButtonText}>Import Quantum Wallet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
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
  content: {
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
  inputContainer: {
    marginBottom: 40,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  inputSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  mnemonicInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 120,
  },
  validInput: {
    borderColor: '#4CAF50',
  },
  invalidInput: {
    borderColor: '#F44336',
  },
  validationText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  validText: {
    color: '#4CAF50',
  },
  invalidText: {
    color: '#F44336',
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
  importButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
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
}); 
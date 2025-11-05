/**
 * Settings Screen - Mobile wallet settings and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  useColorScheme,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Services
import { WalletService } from '../services/WalletService';
import { BiometricService } from '../services/BiometricService';

// Types
import { WalletInfo } from '../types/wallet';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'private' | 'minimal'>('private');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);

  const walletService = WalletService.getInstance();
  const biometricService = BiometricService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load wallet info
      const walletData = await walletService.getWallet();
      setWallet(walletData);

      // Load biometric settings
      const biometricAvailable = await biometricService.isBiometricAvailable();
      setBiometricAvailable(biometricAvailable);
      
      const biometricEnabled = await biometricService.isEnabled();
      setBiometricEnabled(biometricEnabled);

      // Load other settings from storage
      // In a real implementation, these would be loaded from AsyncStorage
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        const success = await biometricService.enableBiometric();
        if (success) {
          setBiometricEnabled(true);
          Alert.alert('Success', 'Biometric authentication enabled');
        } else {
          Alert.alert('Error', 'Failed to enable biometric authentication');
        }
      } else {
        await biometricService.disableBiometric();
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric authentication disabled');
      }
    } catch (error) {
      console.error('Failed to toggle biometric:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handlePrivacyLevelChange = (level: 'public' | 'private' | 'minimal') => {
    setPrivacyLevel(level);
    // In a real implementation, this would save to storage
    Alert.alert('Privacy Updated', `Privacy level set to ${level}`);
  };

  const handleBackupWallet = async () => {
    try {
      const backup = await walletService.backupWallet();
      Alert.alert(
        'Backup Created',
        `Wallet backup saved as ${backup.filename}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet backup');
    }
  };

  const handleExportWallet = () => {
    Alert.alert(
      'Export Wallet',
      'This will export your wallet data including private keys. Keep it secure!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          style: 'destructive',
          onPress: () => {
            // In a real implementation, this would export wallet data
            Alert.alert('Exported', 'Wallet data exported successfully');
          }
        }
      ]
    );
  };

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This action cannot be undone. All funds will be lost unless you have a backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // In a real implementation, this would delete the wallet
            Alert.alert('Deleted', 'Wallet deleted successfully');
            navigation.navigate('Welcome' as never);
          }
        }
      ]
    );
  };

  const handleViewMnemonic = () => {
    Alert.alert(
      'View Recovery Phrase',
      'This will show your 12-word recovery phrase. Keep it secure and private!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Show', 
          onPress: () => {
            if (wallet) {
              Alert.alert(
                'Recovery Phrase',
                wallet.mnemonic,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleOpenSupport = () => {
    Linking.openURL('https://zippyfoundation.org/support');
  };

  const handleOpenPrivacyPolicy = () => {
    Linking.openURL('https://zippyfoundation.org/privacy');
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://zippyfoundation.org/terms');
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  const getPrivacyLevelDescription = (level: string) => {
    switch (level) {
      case 'public':
        return 'Share all data for maximum transparency';
      case 'private':
        return 'Share minimal data for privacy';
      case 'minimal':
        return 'Share only essential data';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          Settings
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Wallet Information */}
        {wallet && (
          <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
              Wallet Information
            </Text>
            <View style={styles.walletInfo}>
              <View style={styles.walletInfoRow}>
                <Text style={[styles.walletInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                  Address:
                </Text>
                <Text style={[styles.walletInfoValue, isDarkMode && styles.textDark]}>
                  {formatAddress(wallet.address)}
                </Text>
              </View>
              <View style={styles.walletInfoRow}>
                <Text style={[styles.walletInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                  Balance:
                </Text>
                <Text style={[styles.walletInfoValue, isDarkMode && styles.textDark]}>
                  {wallet.balance} ZIP
                </Text>
              </View>
              <View style={styles.walletInfoRow}>
                <Text style={[styles.walletInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                  Trust Score:
                </Text>
                <Text style={[styles.walletInfoValue, isDarkMode && styles.textDark]}>
                  {wallet.trustScore}
                </Text>
              </View>
              <View style={styles.walletInfoRow}>
                <Text style={[styles.walletInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                  Created:
                </Text>
                <Text style={[styles.walletInfoValue, isDarkMode && styles.textDark]}>
                  {new Date(wallet.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Security Settings */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Security
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="fingerprint" size={24} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Biometric Authentication
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Use fingerprint or Face ID
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={biometricEnabled ? '#4caf50' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleViewMnemonic}
          >
            <View style={styles.settingLeft}>
              <Icon name="security" size={24} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  View Recovery Phrase
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Show 12-word backup phrase
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Privacy
          </Text>
          
          <View style={styles.privacyOptions}>
            {(['public', 'private', 'minimal'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.privacyOption,
                  privacyLevel === level && styles.privacyOptionSelected,
                  isDarkMode && styles.privacyOptionDark
                ]}
                onPress={() => handlePrivacyLevelChange(level)}
              >
                <View style={styles.privacyOptionHeader}>
                  <Text style={[
                    styles.privacyOptionTitle,
                    isDarkMode && styles.textDark,
                    privacyLevel === level && styles.privacyOptionTitleSelected
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                  {privacyLevel === level && (
                    <Icon name="check" size={20} color="#4CAF50" />
                  )}
                </View>
                <Text style={[
                  styles.privacyOptionDescription,
                  isDarkMode && styles.textSecondaryDark
                ]}>
                  {getPrivacyLevelDescription(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Notifications
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="notifications" size={24} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Push Notifications
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Receive transaction alerts
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={notificationsEnabled ? '#4caf50' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="backup" size={24} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Auto Backup
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Automatically backup wallet
                </Text>
              </View>
            </View>
            <Switch
              value={autoBackupEnabled}
              onValueChange={setAutoBackupEnabled}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={autoBackupEnabled ? '#4caf50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Wallet Management */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Wallet Management
          </Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleBackupWallet}
          >
            <View style={styles.settingLeft}>
              <Icon name="cloud-download" size={24} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Backup Wallet
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Create wallet backup
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleExportWallet}
          >
            <View style={styles.settingLeft}>
              <Icon name="file-download" size={24} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Export Wallet
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Export wallet data
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleDeleteWallet}
          >
            <View style={styles.settingLeft}>
              <Icon name="delete-forever" size={24} color="#F44336" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, styles.dangerText]}>
                  Delete Wallet
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Permanently delete wallet
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Support & Legal
          </Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleOpenSupport}
          >
            <View style={styles.settingLeft}>
              <Icon name="help" size={24} color="#2196F3" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Support
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Get help and support
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleOpenPrivacyPolicy}
          >
            <View style={styles.settingLeft}>
              <Icon name="privacy-tip" size={24} color="#4CAF50" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Privacy Policy
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Read our privacy policy
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleOpenTerms}
          >
            <View style={styles.settingLeft}>
              <Icon name="description" size={24} color="#FF9800" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>
                  Terms of Service
                </Text>
                <Text style={[styles.settingSubtitle, isDarkMode && styles.textSecondaryDark]}>
                  Read our terms of service
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            App Information
          </Text>
          
          <View style={styles.appInfo}>
            <View style={styles.appInfoRow}>
              <Text style={[styles.appInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                Version:
              </Text>
              <Text style={[styles.appInfoValue, isDarkMode && styles.textDark]}>
                1.0.0
              </Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={[styles.appInfoLabel, isDarkMode && styles.textSecondaryDark]}>
                Build:
              </Text>
              <Text style={[styles.appInfoValue, isDarkMode && styles.textDark]}>
                2024.1.1
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionDark: {
    backgroundColor: '#1E1E1E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  walletInfo: {
    gap: 8,
  },
  walletInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletInfoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  walletInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionDark: {
    backgroundColor: '#2A2A2A',
  },
  privacyOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  privacyOptionTitleSelected: {
    color: '#4CAF50',
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  appInfo: {
    gap: 8,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  dangerText: {
    color: '#F44336',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textSecondaryDark: {
    color: '#CCCCCC',
  },
});

export default SettingsScreen; 
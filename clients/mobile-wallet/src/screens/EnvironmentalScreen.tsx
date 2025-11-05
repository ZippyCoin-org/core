import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { EnvironmentalDataService } from '../services/EnvironmentalDataService';
import { TrustService } from '../services/TrustService';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Environmental: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type EnvironmentalScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Environmental'
>;

type EnvironmentalScreenRouteProp = RouteProp<
  RootStackParamList,
  'Environmental'
>;

interface Props {
  navigation: EnvironmentalScreenNavigationProp;
  route: EnvironmentalScreenRouteProp;
}

interface EnvironmentalMetric {
  timestamp: number;
  temperature: number;
  humidity: number;
  airQuality: number;
  co2: number;
  particulate: number;
  uvIndex: number;
}

interface CarbonFootprint {
  total: number;
  transportation: number;
  energy: number;
  waste: number;
  lifestyle: number;
  offset: number;
}

interface EnvironmentalAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export const EnvironmentalScreen: React.FC<Props> = ({ navigation }) => {
  const [currentData, setCurrentData] = useState<any>(null);
  const [metrics, setMetrics] = useState<EnvironmentalMetric[]>([]);
  const [carbonFootprint, setCarbonFootprint] = useState<CarbonFootprint | null>(null);
  const [achievements, setAchievements] = useState<EnvironmentalAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [environmentalService] = useState(() => new EnvironmentalDataService());
  const [trustService] = useState(() => new TrustService());

  useEffect(() => {
    loadEnvironmentalData();
    loadAchievements();
  }, []);

  const loadEnvironmentalData = async () => {
    try {
      // In a real implementation, you would get the user's wallet address
      // For now, we'll use a mock address
      const mockAddress = 'zpc1user123...';

      setUserAddress(mockAddress);

      // Load environmental data for the user's location/address
      const data = await environmentalService.getEnvironmentalDataForAddress(mockAddress);
      setCurrentData(data);

      // Load carbon footprint
      const footprint = await environmentalService.getEnvironmentalImpact(mockAddress);
      setCarbonFootprint({
        total: footprint.carbonFootprint,
        transportation: footprint.carbonFootprint * 0.4,
        energy: footprint.carbonFootprint * 0.3,
        waste: footprint.carbonFootprint * 0.15,
        lifestyle: footprint.carbonFootprint * 0.1,
        offset: footprint.carbonFootprint * 0.05,
      });

      // Load historical metrics
      const historicalData = await environmentalService.getEnvironmentalMetrics(
        0, 0, 'week' // Mock coordinates
      );
      setMetrics(historicalData);
    } catch (error) {
      logger.error('Failed to load environmental data', { error: error.message });
      // Set mock data for demonstration
      setMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const setMockData = () => {
    setCurrentData({
      temperature: 22.5,
      humidity: 65,
      airQuality: 85,
      co2: 412,
      particulate: 15,
      uvIndex: 3,
      location: 'Your Location',
      lastUpdated: Date.now(),
    });

    setCarbonFootprint({
      total: 2.4,
      transportation: 0.96,
      energy: 0.72,
      waste: 0.36,
      lifestyle: 0.24,
      offset: 0.12,
    });

    const mockMetrics: EnvironmentalMetric[] = Array.from({ length: 7 }, (_, i) => ({
      timestamp: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
      temperature: 20 + Math.random() * 5,
      humidity: 60 + Math.random() * 10,
      airQuality: 80 + Math.random() * 20,
      co2: 400 + Math.random() * 50,
      particulate: 10 + Math.random() * 10,
      uvIndex: Math.floor(Math.random() * 11),
    }));
    setMetrics(mockMetrics);
  };

  const loadAchievements = async () => {
    // Mock achievements
    const mockAchievements: EnvironmentalAchievement[] = [
      {
        id: 'carbon-neutral',
        name: 'Carbon Neutral',
        description: 'Offset 100% of your carbon footprint',
        icon: '🌱',
        unlocked: false,
        progress: 45,
        target: 100,
      },
      {
        id: 'green-traveler',
        name: 'Green Traveler',
        description: 'Use eco-friendly transportation for 30 days',
        icon: '🚲',
        unlocked: true,
        progress: 30,
        target: 30,
      },
      {
        id: 'energy-saver',
        name: 'Energy Saver',
        description: 'Reduce energy consumption by 20%',
        icon: '⚡',
        unlocked: false,
        progress: 15,
        target: 20,
      },
      {
        id: 'zero-waste',
        name: 'Zero Waste',
        description: 'Go 7 days without generating waste',
        icon: '♻️',
        unlocked: false,
        progress: 3,
        target: 7,
      },
    ];
    setAchievements(mockAchievements);
  };

  const handleSubmitEnvironmentalData = async () => {
    if (!currentData) return;

    setIsSubmitting(true);
    try {
      const environmentalData = {
        address: userAddress,
        temperature: currentData.temperature,
        humidity: currentData.humidity,
        airQuality: currentData.airQuality,
        co2: currentData.co2,
        particulate: currentData.particulate,
        uvIndex: currentData.uvIndex,
        timestamp: Date.now(),
        location: currentData.location,
      };

      await environmentalService.submitEnvironmentalData(environmentalData);
      Alert.alert('Success', 'Environmental data submitted successfully');
    } catch (error) {
      logger.error('Failed to submit environmental data', { error: error.message });
      Alert.alert('Error', 'Failed to submit environmental data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAirQualityColor = (aqi: number) => {
    if (aqi <= 50) return '#00FF88';
    if (aqi <= 100) return '#FFAA00';
    if (aqi <= 150) return '#FF6600';
    return '#FF4444';
  };

  const getAirQualityLabel = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const renderMetricCard = (title: string, value: string | number, unit: string, icon: string) => {
    return (
      <View style={styles.metricCard}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    );
  };

  const renderAchievementItem = (achievement: EnvironmentalAchievement) => {
    const progressPercent = (achievement.progress / achievement.target) * 100;

    return (
      <View key={achievement.id} style={styles.achievementItem}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementIcon}>{achievement.icon}</Text>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
          </View>
          {achievement.unlocked && (
            <Text style={styles.unlockedBadge}>✓</Text>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progressPercent, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {achievement.progress}/{achievement.target}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading environmental data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Environmental Impact</Text>
        <Text style={styles.subtitle}>
          Track your environmental footprint and earn rewards
        </Text>
      </View>

      {/* Current Environmental Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Conditions</Text>
        {currentData && (
          <View style={styles.metricsGrid}>
            {renderMetricCard('Temperature', currentData.temperature.toFixed(1), '°C', '🌡️')}
            {renderMetricCard('Humidity', currentData.humidity.toFixed(0), '%', '💧')}
            {renderMetricCard('Air Quality', currentData.airQuality.toFixed(0), 'AQI', '🌬️')}
            {renderMetricCard('CO₂', currentData.co2.toFixed(0), 'ppm', '🌍')}
            {renderMetricCard('Particulate', currentData.particulate.toFixed(1), 'µg/m³', '💨')}
            {renderMetricCard('UV Index', currentData.uvIndex.toFixed(0), '', '☀️')}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmitEnvironmentalData}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Environmental Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Carbon Footprint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carbon Footprint</Text>
        {carbonFootprint && (
          <View style={styles.carbonFootprint}>
            <View style={styles.totalCarbon}>
              <Text style={styles.totalCarbonValue}>
                {carbonFootprint.total.toFixed(2)}
              </Text>
              <Text style={styles.totalCarbonUnit}>tons CO₂/year</Text>
            </View>

            <View style={styles.carbonBreakdown}>
              <View style={styles.carbonItem}>
                <Text style={styles.carbonLabel}>Transportation</Text>
                <Text style={styles.carbonValue}>
                  {carbonFootprint.transportation.toFixed(2)}t
                </Text>
              </View>
              <View style={styles.carbonItem}>
                <Text style={styles.carbonLabel}>Energy</Text>
                <Text style={styles.carbonValue}>
                  {carbonFootprint.energy.toFixed(2)}t
                </Text>
              </View>
              <View style={styles.carbonItem}>
                <Text style={styles.carbonLabel}>Waste</Text>
                <Text style={styles.carbonValue}>
                  {carbonFootprint.waste.toFixed(2)}t
                </Text>
              </View>
              <View style={styles.carbonItem}>
                <Text style={styles.carbonLabel}>Lifestyle</Text>
                <Text style={styles.carbonValue}>
                  {carbonFootprint.lifestyle.toFixed(2)}t
                </Text>
              </View>
              <View style={[styles.carbonItem, styles.offsetItem]}>
                <Text style={styles.carbonLabel}>Offset</Text>
                <Text style={styles.carbonValue}>
                  -{carbonFootprint.offset.toFixed(2)}t
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environmental Achievements</Text>
        {achievements.map(renderAchievementItem)}
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
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 5,
  },
  metricTitle: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  carbonFootprint: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  totalCarbon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalCarbonValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 5,
  },
  totalCarbonUnit: {
    fontSize: 14,
    color: '#888888',
  },
  carbonBreakdown: {
    gap: 10,
  },
  carbonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offsetItem: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 10,
  },
  carbonLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  carbonValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  achievementItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  unlockedBadge: {
    fontSize: 20,
    color: '#00FF88',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#CCCCCC',
    minWidth: 50,
  },
});

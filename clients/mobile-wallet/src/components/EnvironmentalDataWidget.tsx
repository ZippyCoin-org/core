import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EnvironmentalData } from '../services/EnvironmentalDataService';

interface EnvironmentalDataWidgetProps {
  environmentalData: EnvironmentalData;
  onPress?: () => void;
}

export const EnvironmentalDataWidget: React.FC<EnvironmentalDataWidgetProps> = ({ 
  environmentalData, 
  onPress 
}) => {
  const getEnvironmentalStatus = (data: EnvironmentalData) => {
    // Check if environmental data is stable for quantum-resistant verification
    const tempStable = Math.abs(data.temperature - 25) < 10;
    const humidityStable = data.humidity > 20 && data.humidity < 80;
    const pressureStable = data.pressure > 900 && data.pressure < 1100;
    
    const accelMagnitude = Math.sqrt(
      data.accelerometer.x ** 2 + 
      data.accelerometer.y ** 2 + 
      data.accelerometer.z ** 2
    );
    const accelStable = accelMagnitude >= 8 && accelMagnitude <= 12;
    
    const stableFactors = [tempStable, humidityStable, pressureStable, accelStable];
    const stableCount = stableFactors.filter(Boolean).length;
    
    if (stableCount >= 3) return { status: 'Stable', color: '#4CAF50' };
    if (stableCount >= 2) return { status: 'Fair', color: '#FF9800' };
    return { status: 'Unstable', color: '#F44336' };
  };

  const environmentalStatus = getEnvironmentalStatus(environmentalData);

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: environmentalStatus.color }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🌡️</Text>
      </View>
      <View style={styles.dataContainer}>
        <Text style={[styles.status, { color: environmentalStatus.color }]}>
          {environmentalStatus.status}
        </Text>
        <Text style={styles.temperature}>
          {Math.round(environmentalData.temperature)}°C
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 6,
  },
  icon: {
    fontSize: 16,
  },
  dataContainer: {
    alignItems: 'center',
  },
  status: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  temperature: {
    fontSize: 10,
    color: '#888',
  },
}); 
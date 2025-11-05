import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrustScore } from '../services/TrustService';

interface TrustScoreWidgetProps {
  trustScore: TrustScore;
  onPress?: () => void;
}

export const TrustScoreWidget: React.FC<TrustScoreWidgetProps> = ({ trustScore, onPress }) => {
  const getTrustColor = (score: number) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    if (score >= 40) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  const getTrustLevel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const trustColor = getTrustColor(trustScore.score);
  const trustLevel = getTrustLevel(trustScore.score);

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: trustColor }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: trustColor }]}>
          {Math.round(trustScore.score)}
        </Text>
        <Text style={styles.label}>Trust</Text>
      </View>
      <View style={styles.levelContainer}>
        <Text style={[styles.level, { color: trustColor }]}>
          {trustLevel}
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
    marginRight: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginRight: 6,
  },
  score: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 8,
    color: '#888',
    textTransform: 'uppercase',
  },
  levelContainer: {
    alignItems: 'center',
  },
  level: {
    fontSize: 10,
    fontWeight: '600',
  },
}); 
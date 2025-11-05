import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
}

const QuickActionButton: React.FC<Props> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.container} onPress={onPress}>
    <Icon name={icon} size={24} color="#007AFF" />
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginHorizontal: 12 },
  label: { marginTop: 4, fontSize: 12 },
});

export default QuickActionButton; 
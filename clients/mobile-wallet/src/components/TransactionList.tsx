import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

interface Tx {
  id: string;
  date?: string;
  amount?: string;
}

interface Props {
  transactions: Tx[];
  onPress: (tx: Tx) => void;
}

const TransactionList: React.FC<Props> = ({ transactions, onPress }) => (
  <FlatList
    data={transactions}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.item} onPress={() => onPress(item)}>
        <Text>{item.id}</Text>
      </TouchableOpacity>
    )}
    ListEmptyComponent={() => (
      <View style={styles.empty}><Text>No transactions</Text></View>
    )}
  />
);

const styles = StyleSheet.create({
  item: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  empty: { padding: 16, alignItems: 'center' },
});

export default TransactionList; 
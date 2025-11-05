import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { logger } from '../utils/logger';

type RootStackParamList = {
  NFT: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type NFTScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'NFT'
>;

type NFTScreenRouteProp = RouteProp<
  RootStackParamList,
  'NFT'
>;

interface Props {
  navigation: NFTScreenNavigationProp;
  route: NFTScreenRouteProp;
}

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  contractAddress: string;
  tokenId: string;
  collection: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  rarity: number;
  floorPrice?: string;
  lastSale?: string;
}

interface NFTCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  contractAddress: string;
  totalSupply: number;
  floorPrice: string;
  volume24h: string;
  items: number;
}

export const NFTScreen: React.FC<Props> = ({ navigation }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'owned' | 'collections'>('owned');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  useEffect(() => {
    loadNFTData();
  }, []);

  const loadNFTData = async () => {
    try {
      // In a real implementation, you would fetch NFTs from the blockchain/NFT marketplace
      // For now, we'll use mock data
      const mockNFTs: NFT[] = [
        {
          id: 'nft-1',
          name: 'ZippyCoin Genesis #001',
          description: 'The first ZippyCoin NFT minted on the network.',
          image: 'https://via.placeholder.com/300x300/00FF88/000000?text=ZPC+Genesis',
          contractAddress: 'zpc1nftcontract...',
          tokenId: '1',
          collection: 'ZippyCoin Genesis',
          attributes: [
            { trait_type: 'Rarity', value: 'Legendary' },
            { trait_type: 'Type', value: 'Genesis' },
            { trait_type: 'Minted', value: '2024' },
          ],
          rarity: 95,
          floorPrice: '1000',
          lastSale: '1500',
        },
        {
          id: 'nft-2',
          name: 'Green Guardian #042',
          description: 'A guardian NFT representing environmental commitment.',
          image: 'https://via.placeholder.com/300x300/00AA44/FFFFFF?text=Green+Guardian',
          contractAddress: 'zpc1greencontract...',
          tokenId: '42',
          collection: 'Green Guardians',
          attributes: [
            { trait_type: 'Rarity', value: 'Rare' },
            { trait_type: 'Type', value: 'Guardian' },
            { trait_type: 'Element', value: 'Earth' },
          ],
          rarity: 75,
          floorPrice: '250',
          lastSale: '320',
        },
      ];

      const mockCollections: NFTCollection[] = [
        {
          id: 'collection-1',
          name: 'ZippyCoin Genesis',
          description: 'The original collection of ZippyCoin NFTs.',
          image: 'https://via.placeholder.com/200x200/00FF88/000000?text=Genesis',
          contractAddress: 'zpc1genesis...',
          totalSupply: 1000,
          floorPrice: '800',
          volume24h: '125000',
          items: 950,
        },
        {
          id: 'collection-2',
          name: 'Green Guardians',
          description: 'NFTs representing environmental stewardship.',
          image: 'https://via.placeholder.com/200x200/00AA44/FFFFFF?text=Guardians',
          contractAddress: 'zpc1guardians...',
          totalSupply: 5000,
          floorPrice: '150',
          volume24h: '45000',
          items: 4850,
        },
      ];

      setNfts(mockNFTs);
      setCollections(mockCollections);
    } catch (error) {
      logger.error('Failed to load NFT data', { error: error.message });
      Alert.alert('Error', 'Failed to load NFT data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFTTransfer = async (nft: NFT) => {
    Alert.alert(
      'Transfer NFT',
      `Transfer "${nft.name}" to another address?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Transfer',
          onPress: () => {
            // In a real implementation, you would navigate to a transfer screen
            Alert.alert('Info', 'NFT transfer functionality would be implemented here');
          },
        },
      ]
    );
  };

  const handleNFTSell = async (nft: NFT) => {
    Alert.alert(
      'Sell NFT',
      `List "${nft.name}" for sale?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'List for Sale',
          onPress: () => {
            // In a real implementation, you would navigate to a listing screen
            Alert.alert('Info', 'NFT marketplace functionality would be implemented here');
          },
        },
      ]
    );
  };

  const renderNFTItem = (nft: NFT) => {
    return (
      <TouchableOpacity
        key={nft.id}
        style={styles.nftItem}
        onPress={() => setSelectedNFT(selectedNFT?.id === nft.id ? null : nft)}
      >
        <Image source={{ uri: nft.image }} style={styles.nftImage} />
        <View style={styles.nftInfo}>
          <Text style={styles.nftName}>{nft.name}</Text>
          <Text style={styles.nftCollection}>{nft.collection}</Text>
          <Text style={styles.nftRarity}>Rarity: {nft.rarity}%</Text>
          {nft.floorPrice && (
            <Text style={styles.nftPrice}>Floor: {nft.floorPrice} ZPC</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNFTDetail = (nft: NFT) => {
    return (
      <View style={styles.nftDetail}>
        <Image source={{ uri: nft.image }} style={styles.detailImage} />
        <View style={styles.detailInfo}>
          <Text style={styles.detailName}>{nft.name}</Text>
          <Text style={styles.detailDescription}>{nft.description}</Text>

          <View style={styles.detailStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Collection</Text>
              <Text style={styles.statValue}>{nft.collection}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Token ID</Text>
              <Text style={styles.statValue}>{nft.tokenId}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Rarity</Text>
              <Text style={styles.statValue}>{nft.rarity}%</Text>
            </View>
            {nft.floorPrice && (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Floor Price</Text>
                <Text style={styles.statValue}>{nft.floorPrice} ZPC</Text>
              </View>
            )}
          </View>

          <View style={styles.attributes}>
            <Text style={styles.attributesTitle}>Attributes</Text>
            {nft.attributes.map((attr, index) => (
              <View key={index} style={styles.attribute}>
                <Text style={styles.attributeType}>{attr.trait_type}</Text>
                <Text style={styles.attributeValue}>{attr.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.nftActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.transferButton]}
              onPress={() => handleNFTTransfer(nft)}
            >
              <Text style={styles.transferButtonText}>Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.sellButton]}
              onPress={() => handleNFTSell(nft)}
            >
              <Text style={styles.sellButtonText}>Sell</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCollectionItem = (collection: NFTCollection) => {
    return (
      <TouchableOpacity
        key={collection.id}
        style={styles.collectionItem}
        onPress={() => {
          // In a real implementation, you would navigate to collection detail
          Alert.alert('Info', `View ${collection.name} collection`);
        }}
      >
        <Image source={{ uri: collection.image }} style={styles.collectionImage} />
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName}>{collection.name}</Text>
          <Text style={styles.collectionDescription} numberOfLines={2}>
            {collection.description}
          </Text>
          <View style={styles.collectionStats}>
            <Text style={styles.collectionStat}>
              {collection.items}/{collection.totalSupply} items
            </Text>
            <Text style={styles.collectionStat}>
              Floor: {collection.floorPrice} ZPC
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading NFTs...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NFT Gallery</Text>
        <Text style={styles.subtitle}>
          View and manage your ZippyCoin NFTs
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'owned' && styles.tabActive]}
          onPress={() => setSelectedTab('owned')}
        >
          <Text style={[styles.tabText, selectedTab === 'owned' && styles.tabTextActive]}>
            My NFTs ({nfts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'collections' && styles.tabActive]}
          onPress={() => setSelectedTab('collections')}
        >
          <Text style={[styles.tabText, selectedTab === 'collections' && styles.tabTextActive]}>
            Collections
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {selectedTab === 'owned' ? (
          <>
            {selectedNFT ? (
              renderNFTDetail(selectedNFT)
            ) : (
              <View style={styles.nftGrid}>
                {nfts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No NFTs owned</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Start collecting ZippyCoin NFTs to see them here
                    </Text>
                  </View>
                ) : (
                  nfts.map(renderNFTItem)
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.collectionsList}>
            {collections.map(renderCollectionItem)}
          </View>
        )}
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00FF88',
  },
  tabText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#00FF88',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  nftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nftItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    width: '48%',
  },
  nftImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  nftInfo: {
    alignItems: 'center',
  },
  nftName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'center',
  },
  nftCollection: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
    textAlign: 'center',
  },
  nftRarity: {
    fontSize: 10,
    color: '#00FF88',
    marginBottom: 2,
    textAlign: 'center',
  },
  nftPrice: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nftDetail: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailInfo: {},
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  stat: {
    minWidth: 80,
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  attributes: {
    marginBottom: 20,
  },
  attributesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  attribute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  attributeType: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  attributeValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  nftActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  transferButton: {
    backgroundColor: '#333333',
  },
  transferButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  sellButton: {
    backgroundColor: '#00FF88',
  },
  sellButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  collectionsList: {},
  collectionItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 10,
  },
  collectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  collectionStat: {
    fontSize: 12,
    color: '#888888',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
});

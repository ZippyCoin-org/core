import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { logger } from '../utils/logger';

type RootStackParamList = {
  Governance: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

type GovernanceScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Governance'
>;

type GovernanceScreenRouteProp = RouteProp<
  RootStackParamList,
  'Governance'
>;

interface Props {
  navigation: GovernanceScreenNavigationProp;
  route: GovernanceScreenRouteProp;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endTime: number;
  type: 'parameter' | 'funding' | 'protocol' | 'constitutional';
  category: string;
}

interface Vote {
  proposalId: string;
  vote: 'yes' | 'no' | 'abstain';
  votingPower: number;
  timestamp: number;
}

export const GovernanceScreen: React.FC<Props> = ({ navigation }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'all'>('active');
  const [votingPower, setVotingPower] = useState(0);

  useEffect(() => {
    loadGovernanceData();
  }, []);

  const loadGovernanceData = async () => {
    try {
      // In a real implementation, you would fetch proposals from the blockchain
      // For now, we'll use mock data
      const mockProposals: Proposal[] = [
        {
          id: 'prop-1',
          title: 'Increase Block Size Limit',
          description: 'Proposal to increase the maximum block size from 1MB to 2MB to improve network throughput.',
          proposer: 'zpc1foundation...',
          status: 'active',
          votesFor: 45000,
          votesAgainst: 15000,
          totalVotes: 60000,
          endTime: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
          type: 'parameter',
          category: 'Network',
        },
        {
          id: 'prop-2',
          title: 'Environmental Fund Allocation',
          description: 'Allocate 10% of block rewards to environmental initiatives and carbon offset programs.',
          proposer: 'zpc1greenvalidator...',
          status: 'active',
          votesFor: 52000,
          votesAgainst: 8000,
          totalVotes: 60000,
          endTime: Date.now() + (5 * 24 * 60 * 60 * 1000), // 5 days from now
          type: 'funding',
          category: 'Environmental',
        },
        {
          id: 'prop-3',
          title: 'New Validator Requirements',
          description: 'Update minimum staking requirements for validators to improve network security.',
          proposer: 'zpc1securitycouncil...',
          status: 'passed',
          votesFor: 55000,
          votesAgainst: 5000,
          totalVotes: 60000,
          endTime: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          type: 'protocol',
          category: 'Security',
        },
      ];

      const mockUserVotes: Vote[] = [
        {
          proposalId: 'prop-2',
          vote: 'yes',
          votingPower: 1000,
          timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000),
        },
      ];

      setProposals(mockProposals);
      setUserVotes(mockUserVotes);
      setVotingPower(1500); // Mock voting power
    } catch (error) {
      logger.error('Failed to load governance data', { error: error.message });
      Alert.alert('Error', 'Failed to load governance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (proposalId: string, vote: 'yes' | 'no' | 'abstain') => {
    const existingVote = userVotes.find(v => v.proposalId === proposalId);

    if (existingVote) {
      Alert.alert('Already Voted', 'You have already voted on this proposal.');
      return;
    }

    Alert.alert(
      'Confirm Vote',
      `Are you sure you want to vote "${vote.toUpperCase()}" on this proposal? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: vote === 'yes' ? 'Vote Yes' : vote === 'no' ? 'Vote No' : 'Abstain',
          onPress: async () => {
            try {
              // In a real implementation, you would submit the vote to the blockchain
              await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

              const newVote: Vote = {
                proposalId,
                vote,
                votingPower,
                timestamp: Date.now(),
              };

              setUserVotes(prev => [...prev, newVote]);
              loadGovernanceData(); // Refresh data

              Alert.alert('Success', 'Your vote has been submitted successfully.');
            } catch (error) {
              logger.error('Failed to submit vote', { error: error.message });
              Alert.alert('Error', 'Failed to submit vote');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'active':
        return '#00FF88';
      case 'passed':
        return '#00FF88';
      case 'rejected':
        return '#FF4444';
      case 'executed':
        return '#888888';
      default:
        return '#888888';
    }
  };

  const getTimeRemaining = (endTime: number) => {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      return 'Ended';
    }

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else {
      return `${hours}h remaining`;
    }
  };

  const renderProposalItem = (proposal: Proposal) => {
    const userVote = userVotes.find(v => v.proposalId === proposal.id);
    const isActive = proposal.status === 'active';

    return (
      <View key={proposal.id} style={styles.proposalItem}>
        <View style={styles.proposalHeader}>
          <View style={styles.proposalTitleContainer}>
            <Text style={styles.proposalTitle}>{proposal.title}</Text>
            <View style={styles.proposalMeta}>
              <Text style={styles.proposalCategory}>{proposal.category}</Text>
              <Text style={styles.proposalType}>{proposal.type}</Text>
            </View>
          </View>
          <View style={styles.proposalStatus}>
            <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
              {proposal.status.toUpperCase()}
            </Text>
            <Text style={styles.timeRemaining}>
              {getTimeRemaining(proposal.endTime)}
            </Text>
          </View>
        </View>

        <Text style={styles.proposalDescription} numberOfLines={3}>
          {proposal.description}
        </Text>

        <View style={styles.proposalStats}>
          <View style={styles.voteStats}>
            <Text style={styles.votesFor}>
              {proposal.votesFor.toLocaleString()} Yes
            </Text>
            <Text style={styles.votesAgainst}>
              {proposal.votesAgainst.toLocaleString()} No
            </Text>
          </View>

          <View style={styles.voteProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(proposal.votesFor / proposal.totalVotes) * 100}%`,
                    backgroundColor: '#00FF88'
                  }
                ]}
              />
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(proposal.votesAgainst / proposal.totalVotes) * 100}%`,
                    backgroundColor: '#FF4444'
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {userVote ? (
          <View style={styles.userVote}>
            <Text style={styles.userVoteText}>
              You voted: {userVote.vote.toUpperCase()} ({userVote.votingPower} votes)
            </Text>
          </View>
        ) : isActive ? (
          <View style={styles.voteButtons}>
            <TouchableOpacity
              style={[styles.voteButton, styles.yesButton]}
              onPress={() => handleVote(proposal.id, 'yes')}
            >
              <Text style={styles.yesButtonText}>Vote Yes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.noButton]}
              onPress={() => handleVote(proposal.id, 'no')}
            >
              <Text style={styles.noButtonText}>Vote No</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.abstainButton]}
              onPress={() => handleVote(proposal.id, 'abstain')}
            >
              <Text style={styles.abstainButtonText}>Abstain</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const filteredProposals = proposals.filter(proposal => {
    if (selectedTab === 'active') {
      return proposal.status === 'active';
    }
    return true;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF88" />
        <Text style={styles.loadingText}>Loading governance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Governance</Text>
        <Text style={styles.subtitle}>
          Participate in ZippyCoin governance and shape the future of the network
        </Text>
        <Text style={styles.votingPower}>
          Your Voting Power: {votingPower} votes
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.tabActive]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            Active Proposals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All Proposals
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {filteredProposals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {selectedTab === 'active' ? 'No active proposals' : 'No proposals found'}
            </Text>
          </View>
        ) : (
          filteredProposals.map(renderProposalItem)
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
    marginBottom: 15,
  },
  votingPower: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: 'bold',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888888',
  },
  proposalItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  proposalTitleContainer: {
    flex: 1,
    marginRight: 15,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  proposalMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  proposalCategory: {
    fontSize: 12,
    color: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proposalType: {
    fontSize: 12,
    color: '#888888',
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proposalStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timeRemaining: {
    fontSize: 10,
    color: '#888888',
  },
  proposalDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 15,
  },
  proposalStats: {
    marginBottom: 15,
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  votesFor: {
    fontSize: 14,
    color: '#00FF88',
    fontWeight: 'bold',
  },
  votesAgainst: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: 'bold',
  },
  voteProgress: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
  },
  userVote: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    padding: 10,
  },
  userVoteText: {
    fontSize: 14,
    color: '#00FF88',
    textAlign: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#00FF88',
  },
  yesButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noButton: {
    backgroundColor: '#FF4444',
  },
  noButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  abstainButton: {
    backgroundColor: '#888888',
  },
  abstainButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

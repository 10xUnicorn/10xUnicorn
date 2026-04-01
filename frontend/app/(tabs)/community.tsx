/**
 * Community Screen
 * Tab-based interface: Leaderboard | Feed | Directory
 * Shows community engagement, top performers, activity, and member directory
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { community, pointsDb, profiles as profilesDb, streaks } from '../../src/utils/database';
import { Colors, Spacing, BorderRadius, Typography, DETERMINATION_EMOJIS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Profile, Signal } from '../../src/types/database';
import CosmicBackground from '../../src/components/CosmicBackground';
import UnicornHeader from '../../src/components/UnicornHeader';

type TabType = 'leaderboard' | 'feed' | 'directory';

interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  totalPoints: number;
  streak: number;
}

interface FeedEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmoji?: string;
  action: string;
  actionType: string;
  timestamp: string;
  badge?: string;
  points: number;
  streakDays?: number;
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [directory, setDirectory] = useState<Profile[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load leaderboard data
  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await community.getLeaderboard(50);
      if (!error && data) {
        const entries: LeaderboardEntry[] = data.map((item, idx) => ({
          rank: idx + 1,
          profile: item.profile,
          totalPoints: item.total_points,
          streak: item.current_streak || 0,
        }));
        setLeaderboard(entries);
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load feed data
  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await community.getActivityFeed(30);
      if (!error && data) {
        const feedItems: FeedEntry[] = data.map((item) => ({
          id: item.id,
          userId: item.user_id || '',
          userName: item.user?.display_name || item.user?.full_name || 'Unicorn',
          userAvatar: item.user?.avatar_url || undefined,
          userEmoji: item.user?.emoji || undefined,
          action: item.title || getActionDescription(item.type || item.action),
          actionType: item.type || '',
          timestamp: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '',
          badge: item.badge_earned,
          points: item.points || 0,
          streakDays: item.streak_days,
        }));
        setFeed(feedItems);
      }
    } catch (e) {
      console.error('Error loading feed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load directory
  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await community.getDirectory();
      if (!error && data) {
        setDirectory(data);
      }
    } catch (e) {
      console.error('Error loading directory:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    } else if (activeTab === 'feed') {
      loadFeed();
    } else if (activeTab === 'directory') {
      loadDirectory();
    }
  }, [activeTab, loadLeaderboard, loadFeed, loadDirectory]);

  // Filter directory by search
  const filteredDirectory = directory.filter(
    (member) =>
      (member.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const getActionDescription = (action: string, title?: string): string => {
    const baseActions: Record<string, string> = {
      signal_completed: 'Completed a revenue-generating signal',
      signal_complete: 'Completed a signal',
      ten_x_action_completed: 'Completed their 10x action',
      '10x_action_completed': 'Completed their 10x action',
      'future_self_completed': 'Wrote to their Future Self',
      'daily_compound_increment': 'Added to their Daily Compound',
      'wormhole_activated': 'Activated a Wormhole connection',
      'tomorrow_prepared': 'Prepared for tomorrow',
      'course_corrected': 'Course corrected their day',
      'determination_level_10': 'Hit Determination Level 10',
      '10x_unicorn_win_bonus': 'Achieved a full 10x Unicorn WIN',
      achievement_unlocked: 'Unlocked an achievement',
      streak_milestone: 'Hit a new streak milestone',
      goal_progress: 'Advanced their 10x goal',
    };
    // If we have a title from the feed data, use it
    if (title) return title;
    return baseActions[action] || action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getPointsBadgeText = (actionType: string, points: number, streakDays?: number): string => {
    if (actionType === 'ten_x_unicorn_win' && streakDays) {
      return `+${points} pts 🦄`;
    } else if (actionType === 'signal_completed' && streakDays) {
      return `+${streakDays * 2} pts ⭐`;
    } else if (actionType === 'ten_x_action_completed') {
      return `+10 pts 🦄`;
    }
    return `+${points} pts`;
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // LEADERBOARD TAB
  // ──────────────────────────────────────────────────────────────────────────────

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={styles.leaderboardItem}>
      <View style={styles.leaderboardRank}>
        <Text style={styles.medalEmoji}>{getMedalEmoji(item.rank)}</Text>
        <Text style={styles.rankNumber}>#{item.rank}</Text>
      </View>
      <View style={styles.leaderboardProfile}>
        {item.profile.avatar_url ? (
          <Image
            source={{ uri: item.profile.avatar_url }}
            style={styles.leaderboardAvatar}
          />
        ) : (
          <View style={[styles.leaderboardAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {item.profile.emoji || (item.profile.display_name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.leaderboardInfo}>
          <Text style={styles.leaderboardName}>{item.profile.display_name || 'Unnamed'}</Text>
          <View style={styles.leaderboardMeta}>
            {item.profile.company && (
              <Text style={styles.leaderboardCompany}>{item.profile.company}</Text>
            )}
            {item.streak > 0 && (
              <View style={styles.streakBadgeLeaderboard}>
                <Text style={styles.streakTextLeaderboard}>🔥 {item.streak} day streak</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <LinearGradient
        colors={[Colors.brand.primary, Colors.brand.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.leaderboardPointsGradient}
      >
        <View style={styles.leaderboardPointsContent}>
          <Text style={styles.pointsValue}>{item.totalPoints.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
          {item.streak > 0 && (
            <Text style={styles.streakBonusText}>+{item.streak} streak bonus</Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // FEED TAB
  // ──────────────────────────────────────────────────────────────────────────────

  const renderFeedItem = ({ item }: { item: FeedEntry }) => (
    <View style={styles.feedItem}>
      <View style={styles.feedHeader}>
        {item.userAvatar ? (
          <Image
            source={{ uri: item.userAvatar }}
            style={styles.feedAvatar}
          />
        ) : (
          <View style={[styles.feedAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {item.userEmoji || (item.userName || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.feedMeta}>
          <Text style={styles.feedName}>{item.userName}</Text>
          <Text style={styles.feedTime}>{item.timestamp}</Text>
        </View>
        <View style={styles.feedPointsBadge}>
          <Text style={styles.feedPointsText}>
            {getPointsBadgeText(item.actionType, item.points, item.streakDays)}
          </Text>
        </View>
      </View>
      <Text style={styles.feedAction}>{item.action}</Text>
      {item.badge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // DIRECTORY TAB
  // ──────────────────────────────────────────────────────────────────────────────

  const renderDirectoryItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.directoryItem}
      onPress={() => setSelectedMember(item)}
    >
      {item.avatar_url ? (
        <Image
          source={{ uri: item.avatar_url }}
          style={styles.directoryAvatar}
        />
      ) : (
        <View style={[styles.directoryAvatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarPlaceholderText}>
            {(item.display_name || 'U')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.directoryInfo}>
        <Text style={styles.directoryName}>{item.display_name || 'Unnamed'}</Text>
        {item.company && <Text style={styles.directoryCompany}>{item.company}</Text>}
        {item.bio && (
          <Text numberOfLines={2} style={styles.directoryBio}>
            {item.bio}
          </Text>
        )}
        {item.services_offered && item.services_offered.length > 0 && (
          <View style={styles.servicesRow}>
            {item.services_offered.slice(0, 2).map((service, idx) => (
              <Text key={idx} style={styles.serviceTag}>
                {service}
              </Text>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.brand.primary} />
    </TouchableOpacity>
  );

  return (
    <CosmicBackground>
    <View style={styles.container}>
      <UnicornHeader>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>Connect with 10x performers</Text>
        </View>
      </UnicornHeader>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['leaderboard', 'feed', 'directory'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab === 'leaderboard' ? 'Leaderboard' : tab === 'feed' ? 'Feed' : 'Directory'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && activeTab === 'leaderboard' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      )}

      {!loading && activeTab === 'leaderboard' && (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => `${item.profile.id}`}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {!loading && activeTab === 'feed' && (
        <FlatList
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateText}>No activity yet</Text>
            </View>
          }
        />
      )}

      {activeTab === 'directory' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or company"
              placeholderTextColor={Colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredDirectory}
            renderItem={renderDirectoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateText}>No members found</Text>
              </View>
            }
          />
        </>
      )}

      {/* Member Profile Modal */}
      <Modal
        visible={selectedMember !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedMember(null)}
            >
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>

            {selectedMember && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Avatar & Name */}
                {selectedMember.avatar_url ? (
                  <Image
                    source={{ uri: selectedMember.avatar_url }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>
                      {(selectedMember.display_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selectedMember.display_name}</Text>
                {selectedMember.title && (
                  <Text style={styles.modalTitle}>{selectedMember.title}</Text>
                )}
                {selectedMember.company && (
                  <Text style={styles.modalCompany}>{selectedMember.company}</Text>
                )}

                {/* Bio */}
                {selectedMember.bio && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>About</Text>
                    <Text style={styles.modalBio}>{selectedMember.bio}</Text>
                  </View>
                )}

                {/* Services */}
                {selectedMember.services_offered && selectedMember.services_offered.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Services Offered</Text>
                    <View style={styles.servicesContainer}>
                      {selectedMember.services_offered.map((service, idx) => (
                        <Text key={idx} style={styles.serviceTag}>
                          {service}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Industries */}
                {selectedMember.industries && selectedMember.industries.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Industries</Text>
                    <View style={styles.industriesContainer}>
                      {selectedMember.industries.map((industry, idx) => (
                        <Text key={idx} style={styles.industryTag}>
                          {industry}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Contact Options */}
                <View style={styles.contactSection}>
                  {selectedMember.email && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() =>
                        Linking.openURL(`mailto:${selectedMember.email}`)
                      }
                    >
                      <Ionicons name="mail" size={18} color={Colors.brand.primary} />
                      <Text style={styles.contactButtonText}>Email</Text>
                    </TouchableOpacity>
                  )}
                  {selectedMember.phone && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() =>
                        Linking.openURL(`sms:${selectedMember.phone}`)
                      }
                    >
                      <Ionicons name="call" size={18} color={Colors.brand.primary} />
                      <Text style={styles.contactButtonText}>SMS</Text>
                    </TouchableOpacity>
                  )}
                  {selectedMember.phone && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() =>
                        Linking.openURL(`tel:${selectedMember.phone}`)
                      }
                    >
                      <Ionicons name="phone-portrait" size={18} color={Colors.brand.primary} />
                      <Text style={styles.contactButtonText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Social Links */}
                {(selectedMember.linkedin_url ||
                  selectedMember.twitter_url ||
                  selectedMember.instagram_url ||
                  selectedMember.youtube_url) && (
                  <View style={styles.socialSection}>
                    {selectedMember.linkedin_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(selectedMember.linkedin_url!)
                        }
                      >
                        <Ionicons name="logo-linkedin" size={24} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    )}
                    {selectedMember.twitter_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(selectedMember.twitter_url!)
                        }
                      >
                        <Ionicons name="logo-twitter" size={24} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    )}
                    {selectedMember.instagram_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(selectedMember.instagram_url!)
                        }
                      >
                        <Ionicons name="logo-instagram" size={24} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    )}
                    {selectedMember.youtube_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(selectedMember.youtube_url!)
                        }
                      >
                        <Ionicons name="logo-youtube" size={24} color={Colors.brand.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    backgroundColor: Colors.background.secondary,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.brand.primary,
  },
  tabLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  tabLabelActive: {
    color: Colors.brand.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ──── Leaderboard ────
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  leaderboardRank: {
    width: 50,
    alignItems: 'center',
  },
  rankNumber: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
  },
  medalEmoji: {
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  leaderboardProfile: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: Spacing.md,
  },
  leaderboardAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardCompany: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginRight: Spacing.md,
  },
  streakBadge: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  streakText: {
    ...Typography.small,
    color: Colors.status.warning,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  leaderboardPointsGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  leaderboardPointsContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBonusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 4,
  },
  streakBadgeLeaderboard: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.status.warning,
  },
  streakTextLeaderboard: {
    ...Typography.small,
    color: Colors.status.warning,
    fontWeight: '600',
  },

  // ──── Feed ────
  feedItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.primary,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  feedMeta: {
    flex: 1,
  },
  feedName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  feedTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  badgeEmoji: {
    fontSize: 18,
  },
  feedAction: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  badgeContainer: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.status.success,
  },
  feedPointsBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  feedPointsText: {
    ...Typography.caption,
    color: Colors.brand.primary,
    fontWeight: '600',
  },

  // ──── Directory ────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
  },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  directoryAvatar: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  directoryInfo: {
    flex: 1,
  },
  directoryName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  directoryCompany: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  directoryBio: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  serviceTag: {
    ...Typography.small,
    backgroundColor: Colors.background.tertiary,
    color: Colors.brand.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },

  // ──── Modal ────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingTop: Spacing.lg,
  },
  modalCloseButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalName: {
    ...Typography.h2,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalCompany: {
    ...Typography.bodyBold,
    color: Colors.brand.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalSection: {
    marginBottom: Spacing.xl,
  },
  modalSectionTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  modalBio: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  industriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  industryTag: {
    ...Typography.caption,
    backgroundColor: Colors.background.tertiary,
    color: Colors.brand.cyan,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  contactSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xl,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  contactButtonText: {
    ...Typography.body,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  socialSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },

  // ──── Avatar Placeholder ────
  avatarPlaceholder: {
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    ...Typography.h3,
    color: Colors.brand.primary,
  },

  // ──── Empty State ────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});

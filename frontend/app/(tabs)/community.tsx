import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, FlatList, Modal,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/utils/api';
import { Colors, Spacing, Radius, FontSize } from '../../src/constants/theme';

type TabType = 'leaderboard' | 'feed' | 'directory';

// Status ring colors based on goal progress
const RING_COLORS: Record<string, [string, string]> = {
  green_fire: ['#00FF88', '#22C55E'],  // Crushing it / on fire
  green: ['#22C55E', '#34D399'],  // On track
  maroon_blue: ['#7C3AED', '#6D28D9'],  // Showing up
  orange: ['#F97316', '#FB923C'],  // Leaning off
  red_pulse: ['#EF4444', '#F87171'],  // Needs support
  gray: ['#6B7280', '#9CA3AF'],  // No goal / incomplete
};

export default function CommunityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showMember, setShowMember] = useState<any>(null);
  const [memberDetail, setMemberDetail] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [lb, f, m] = await Promise.all([
        api.get('/points/leaderboard?limit=50'),
        api.get('/community/feed?limit=30'),
        api.get('/community/members?limit=100'),
      ]);
      setLeaderboard(lb);
      setFeed(f);
      setMembers(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const openMemberProfile = async (userId: string) => {
    try {
      const detail = await api.get(`/member/${userId}`);
      setMemberDetail(detail);
      setShowMember(true);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getRingColors = (ringColor: string | null): [string, string] | null => {
    if (!ringColor) return null;
    return RING_COLORS[ringColor] || RING_COLORS.gray;
  };

  const filteredMembers = search
    ? members.filter(m => 
        m.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.company?.toLowerCase().includes(search.toLowerCase()) ||
        m.goal_title?.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.brand.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Community</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            testID="messages-btn"
            style={styles.headerBtn}
            onPress={() => router.push('/(main)/messages')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={Colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="profile-icon-btn"
            style={styles.profileIconBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person-circle-outline" size={32} color={Colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['leaderboard', 'feed', 'directory'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            testID={`tab-${tab}`}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons 
              name={tab === 'leaderboard' ? 'trophy' : tab === 'feed' ? 'newspaper' : 'people'} 
              size={18} 
              color={activeTab === tab ? Colors.brand.primary : Colors.text.tertiary} 
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <FlatList
          data={leaderboard}
          keyExtractor={(item, i) => `${item.user_id}-${i}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
          ListHeaderComponent={
            <View style={styles.leaderboardHeader}>
              <Text style={styles.leaderboardTitle}>🏆 Top Performers</Text>
              <Text style={styles.leaderboardSub}>Ranked by total points earned</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              testID={`leaderboard-${item.user_id}`}
              style={[styles.leaderboardItem, index < 3 && styles.topThree]}
              onPress={() => openMemberProfile(item.user_id)}
            >
              <View style={[styles.rankBadge, index === 0 && styles.gold, index === 1 && styles.silver, index === 2 && styles.bronze]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.display_name}</Text>
                <Text style={styles.memberGoal} numberOfLines={1}>{item.goal_title}</Text>
              </View>
              <View style={styles.statsCol}>
                <Text style={styles.pointsValue}>{item.total_points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
              <View style={styles.statsCol}>
                <Text style={styles.streakValue}>{item.signal_streak}</Text>
                <Text style={styles.streakLabel}>🔥</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <FlatList
          data={feed}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
          ListHeaderComponent={
            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>⚡ Activity Feed</Text>
              <Text style={styles.feedSub}>See what the community is accomplishing</Text>
            </View>
          }
          renderItem={({ item }) => {
            const ringColors = getRingColors(item.ring_color);
            const isHelpRequest = item.type === 'help_request';
            
            return (
              <TouchableOpacity
                style={styles.feedItem}
                onPress={() => openMemberProfile(item.user_id)}
              >
                {/* Avatar with status ring */}
                <View style={styles.avatarWrapper}>
                  {ringColors ? (
                    <LinearGradient
                      colors={ringColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statusRing}
                    >
                      <View style={styles.feedAvatar}>
                        {item.profile_photo_url ? (
                          <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.feedAvatarText}>{item.display_name?.[0]?.toUpperCase() || '?'}</Text>
                        )}
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.feedAvatar}>
                      {item.profile_photo_url ? (
                        <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.feedAvatarText}>{item.display_name?.[0]?.toUpperCase() || '?'}</Text>
                      )}
                    </View>
                  )}
                  {item.goal_status === 'crushing_it' && (
                    <View style={styles.fireIndicator}>
                      <Text style={styles.fireEmoji}>🔥</Text>
                    </View>
                  )}
                  {item.goal_status === 'needs_support' && (
                    <View style={styles.pulseIndicator}>
                      <Ionicons name="heart" size={12} color={Colors.text.primary} />
                    </View>
                  )}
                </View>
                
                <View style={styles.feedContent}>
                  <View style={styles.feedTop}>
                    <Text style={styles.feedName}>{item.display_name}</Text>
                    <Text style={styles.feedTime}>{formatTime(item.created_at)}</Text>
                  </View>
                  
                  {isHelpRequest ? (
                    <>
                      <View style={styles.helpRequestBadge}>
                        <Ionicons name="hand-left" size={14} color={Colors.status.error} />
                        <Text style={styles.helpRequestText}>Needs Help</Text>
                      </View>
                      <Text style={styles.feedNotes}>"{item.description}"</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.feedAction}>
                        Completed <Text style={styles.feedSignal}>{item.signal_name}</Text>
                      </Text>
                      {item.notes ? <Text style={styles.feedNotes}>"{item.notes}"</Text> : null}
                      <View style={styles.feedFooter}>
                        <View style={styles.feedPointsBadge}>
                          <Ionicons name="flash" size={12} color={Colors.status.success} />
                          <Text style={styles.feedPoints}>+{item.total_points} pts</Text>
                        </View>
                        <Text style={styles.feedGoal} numberOfLines={1}>→ {item.goal_title}</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <Ionicons name="newspaper-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySub}>Complete signals to appear here</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <View style={styles.directoryContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.text.tertiary} />
            <TextInput
              testID="member-search-input"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search members..."
              placeholderTextColor={Colors.text.tertiary}
            />
          </View>
          <FlatList
            data={filteredMembers}
            keyExtractor={(item, i) => `${item.user_id}-${i}`}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`member-${item.user_id}`}
                style={styles.memberCard}
                onPress={() => openMemberProfile(item.user_id)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{item.display_name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberCardName}>{item.display_name}</Text>
                  {item.company && <Text style={styles.memberCardCompany}>{item.company}{item.title ? ` • ${item.title}` : ''}</Text>}
                  {item.goal_title && <Text style={styles.memberCardGoal} numberOfLines={1}>🎯 {item.goal_title}</Text>}
                  {item.services_offered?.length > 0 && (
                    <View style={styles.serviceTags}>
                      {item.services_offered.slice(0, 2).map((s: string) => (
                        <View key={s} style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>{s.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.memberPoints}>
                  <Text style={styles.memberPointsValue}>{item.total_points}</Text>
                  <Text style={styles.memberPointsLabel}>pts</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyFeed}>
                <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {/* Member Detail Modal */}
      <Modal visible={showMember} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Profile</Text>
              <TouchableOpacity testID="close-member-modal" onPress={() => setShowMember(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            {memberDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>{memberDetail.display_name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <Text style={styles.profileName}>{memberDetail.display_name}</Text>
                  {memberDetail.company && <Text style={styles.profileCompany}>{memberDetail.company}</Text>}
                  {memberDetail.title && <Text style={styles.profileTitle}>{memberDetail.title}</Text>}
                  {memberDetail.location && (
                    <View style={styles.profileLocation}>
                      <Ionicons name="location" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.profileLocationText}>{memberDetail.location}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>{memberDetail.total_points}</Text>
                    <Text style={styles.statBoxLabel}>Total Points</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>{memberDetail.weekly_points || 0}</Text>
                    <Text style={styles.statBoxLabel}>This Week</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValue}>{memberDetail.signal_streak || 0}</Text>
                    <Text style={styles.statBoxLabel}>Streak 🔥</Text>
                  </View>
                </View>

                {memberDetail.goal_title && (
                  <LinearGradient colors={[Colors.brand.primary + '20', 'transparent']} style={styles.goalBox}>
                    <Text style={styles.goalBoxLabel}>10x Goal</Text>
                    <Text style={styles.goalBoxTitle}>{memberDetail.goal_title}</Text>
                    {memberDetail.goal_description && <Text style={styles.goalBoxDesc}>{memberDetail.goal_description}</Text>}
                  </LinearGradient>
                )}

                {memberDetail.bio && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>{memberDetail.bio}</Text>
                  </View>
                )}

                {memberDetail.good_connection_for && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Good Connection For</Text>
                    <Text style={styles.sectionText}>{memberDetail.good_connection_for}</Text>
                  </View>
                )}

                {memberDetail.seeking_partnerships && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seeking Partnerships</Text>
                    <Text style={styles.sectionText}>{memberDetail.seeking_partnerships}</Text>
                  </View>
                )}

                {memberDetail.services_offered?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Services Offered</Text>
                    <View style={styles.chipRow}>
                      {memberDetail.services_offered.map((s: string) => (
                        <View key={s} style={styles.chip}>
                          <Text style={styles.chipText}>{s.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {memberDetail.needs?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Looking For</Text>
                    <View style={styles.chipRow}>
                      {memberDetail.needs.map((n: string) => (
                        <View key={n} style={[styles.chip, styles.needChip]}>
                          <Text style={[styles.chipText, styles.needChipText]}>{n.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {(memberDetail.linkedin || memberDetail.twitter || memberDetail.instagram) && (
                  <View style={styles.socialRow}>
                    {memberDetail.linkedin && <Ionicons name="logo-linkedin" size={28} color={Colors.brand.accent} />}
                    {memberDetail.twitter && <Ionicons name="logo-twitter" size={28} color={Colors.brand.accent} />}
                    {memberDetail.instagram && <Ionicons name="logo-instagram" size={28} color={Colors.brand.accent} />}
                    {memberDetail.youtube && <Ionicons name="logo-youtube" size={28} color={Colors.brand.accent} />}
                  </View>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 8, 
    marginBottom: 12 
  },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  profileIconBtn: { padding: 4 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 8 },
  
  // Tab Bar
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.bg.card,
  },
  tabActive: { backgroundColor: Colors.brand.primary + '20', borderWidth: 1, borderColor: Colors.brand.primary },
  tabText: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.brand.primary },
  
  // Leaderboard
  leaderboardHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  leaderboardTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  leaderboardSub: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 4 },
  leaderboardItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: Colors.bg.card, borderRadius: Radius.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  topThree: { borderColor: Colors.brand.primary + '50' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bg.input, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gold: { backgroundColor: '#FFD700' },
  silver: { backgroundColor: '#C0C0C0' },
  bronze: { backgroundColor: '#CD7F32' },
  rankText: { color: Colors.text.primary, fontWeight: '700', fontSize: FontSize.base },
  memberInfo: { flex: 1 },
  memberName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  memberGoal: { color: Colors.text.secondary, fontSize: FontSize.sm },
  statsCol: { alignItems: 'center', marginLeft: 12 },
  pointsValue: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  pointsLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  streakValue: { color: Colors.status.warning, fontSize: FontSize.lg, fontWeight: '700' },
  streakLabel: { fontSize: FontSize.xs },
  
  // Feed
  feedHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  feedTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary },
  feedSub: { color: Colors.text.tertiary, fontSize: FontSize.sm, marginTop: 4 },
  feedItem: {
    flexDirection: 'row', padding: 16,
    backgroundColor: Colors.bg.card, borderRadius: Radius.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  
  // Avatar with status ring
  avatarWrapper: { position: 'relative', marginRight: 12 },
  statusRing: { 
    width: 52, height: 52, borderRadius: 26, 
    justifyContent: 'center', alignItems: 'center', 
    padding: 3 
  },
  feedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  feedAvatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  fireIndicator: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.bg.card, borderRadius: 8, padding: 2 },
  fireEmoji: { fontSize: 12 },
  pulseIndicator: { 
    position: 'absolute', bottom: -2, right: -2, 
    backgroundColor: Colors.status.error, borderRadius: 8, 
    padding: 2 
  },
  helpRequestBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: Colors.status.error + '20', 
    paddingHorizontal: 10, paddingVertical: 4, 
    borderRadius: Radius.sm, alignSelf: 'flex-start', 
    marginBottom: 6 
  },
  helpRequestText: { color: Colors.status.error, fontSize: FontSize.sm, fontWeight: '600' },
  
  feedContent: { flex: 1 },
  feedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  feedName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  feedTime: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  feedAction: { color: Colors.text.secondary, fontSize: FontSize.sm },
  feedSignal: { color: Colors.brand.accent, fontWeight: '600' },
  feedNotes: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontStyle: 'italic', marginTop: 4 },
  feedFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  feedPointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.status.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  feedPoints: { color: Colors.status.success, fontSize: FontSize.xs, fontWeight: '600' },
  feedGoal: { color: Colors.text.tertiary, fontSize: FontSize.xs, flex: 1 },
  emptyFeed: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  
  // Directory
  directoryContainer: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.input, borderRadius: Radius.md, marginHorizontal: 20, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border.default, gap: 8 },
  searchInput: { flex: 1, color: Colors.text.primary, fontSize: FontSize.base, paddingVertical: 12 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: Colors.bg.card, borderRadius: Radius.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  memberDetails: { flex: 1 },
  memberCardName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  memberCardCompany: { color: Colors.text.secondary, fontSize: FontSize.sm },
  memberCardGoal: { color: Colors.brand.accent, fontSize: FontSize.xs, marginTop: 2 },
  serviceTags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  serviceTag: { backgroundColor: Colors.brand.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  serviceTagText: { color: Colors.brand.primary, fontSize: FontSize.xs, textTransform: 'capitalize' },
  memberPoints: { alignItems: 'center' },
  memberPointsValue: { color: Colors.brand.primary, fontSize: FontSize.lg, fontWeight: '700' },
  memberPointsLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  
  // Profile
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileAvatarText: { color: Colors.text.primary, fontSize: 32, fontWeight: '700' },
  profileName: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  profileCompany: { color: Colors.text.secondary, fontSize: FontSize.base, marginTop: 4 },
  profileTitle: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  profileLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  profileLocationText: { color: Colors.text.tertiary, fontSize: FontSize.sm },
  
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  statBoxValue: { color: Colors.brand.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  statBoxLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginTop: 2 },
  
  goalBox: { borderRadius: Radius.md, padding: 16, marginBottom: 20 },
  goalBoxLabel: { color: Colors.text.tertiary, fontSize: FontSize.xs, marginBottom: 4 },
  goalBoxTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  goalBoxDesc: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  
  section: { marginBottom: 16 },
  sectionTitle: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  bioText: { color: Colors.text.secondary, fontSize: FontSize.base, lineHeight: 22 },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.brand.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  chipText: { color: Colors.brand.primary, fontSize: FontSize.sm, textTransform: 'capitalize' },
  needChip: { backgroundColor: Colors.brand.accent + '20' },
  needChipText: { color: Colors.brand.accent },
  
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
});

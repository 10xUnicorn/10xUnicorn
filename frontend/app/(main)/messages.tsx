import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, FlatList, Modal,
  KeyboardAvoidingView, Platform, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { Colors, Radius, FontSize } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

type TabType = 'conversations' | 'groups';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [conversations, setConversations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Chat state
  const [showChat, setShowChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // New group/conversation
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', member_ids: [] as string[] });
  const [members, setMembers] = useState<any[]>([]);
  
  const scrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    try {
      const [convs, grps, mems] = await Promise.all([
        api.get('/messages/conversations'),
        api.get('/messages/groups'),
        api.get('/community/members?limit=100'),
      ]);
      setConversations(convs || []);
      setGroups(grps || []);
      setMembers(mems || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const openDirectChat = async (userId: string, displayName: string) => {
    try {
      const messages = await api.get(`/messages/direct/${userId}`);
      setChatMessages(messages || []);
      setShowChat({ type: 'direct', id: userId, name: displayName });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error(e);
    }
  };

  const openGroupChat = async (group: any) => {
    try {
      const data = await api.get(`/messages/groups/${group.id}`);
      setChatMessages(data.messages || []);
      setShowChat({ type: 'group', id: group.id, name: group.name, members: data.group?.members });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !showChat) return;
    setSendingMessage(true);
    try {
      if (showChat.type === 'direct') {
        await api.post('/messages/direct', { content: newMessage, recipient_id: showChat.id });
        const messages = await api.get(`/messages/direct/${showChat.id}`);
        setChatMessages(messages || []);
      } else {
        await api.post(`/messages/groups/${showChat.id}`, { content: newMessage });
        const data = await api.get(`/messages/groups/${showChat.id}`);
        setChatMessages(data.messages || []);
      }
      setNewMessage('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  const createGroup = async () => {
    if (!groupForm.name.trim() || groupForm.member_ids.length === 0) return;
    try {
      await api.post('/messages/groups', groupForm);
      setShowNewGroup(false);
      setGroupForm({ name: '', description: '', member_ids: [] });
      loadData();
    } catch (e: any) {
      console.error(e);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        <Text style={styles.pageTitle}>Messages</Text>
        <TouchableOpacity testID="new-group-btn" style={styles.addBtn} onPress={() => setShowNewGroup(true)}>
          <Ionicons name="add" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'conversations' && styles.tabActive]}
          onPress={() => setActiveTab('conversations')}
        >
          <Ionicons name="chatbubble" size={18} color={activeTab === 'conversations' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'conversations' && styles.tabTextActive]}>Direct</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Ionicons name="people" size={18} color={activeTab === 'groups' ? Colors.brand.primary : Colors.text.tertiary} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>Groups</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations */}
      {activeTab === 'conversations' && (
        <FlatList
          data={conversations}
          keyExtractor={item => item.user_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.conversationItem} onPress={() => openDirectChat(item.user_id, item.display_name)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.display_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={styles.convName}>{item.display_name}</Text>
                  <Text style={styles.convTime}>{formatTime(item.last_message_at)}</Text>
                </View>
                <Text style={styles.convPreview} numberOfLines={1}>{item.last_message}</Text>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySub}>Start chatting with community members</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Groups */}
      {activeTab === 'groups' && (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.brand.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.conversationItem} onPress={() => openGroupChat(item)}>
              <View style={[styles.avatar, { backgroundColor: Colors.brand.secondary }]}>
                <Ionicons name="people" size={24} color={Colors.text.primary} />
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={styles.convName}>{item.name}</Text>
                  {item.last_message_at && <Text style={styles.convTime}>{formatTime(item.last_message_at)}</Text>}
                </View>
                <Text style={styles.convPreview} numberOfLines={1}>{item.last_message || item.description || 'No messages yet'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySub}>Create a group to chat with multiple members</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Chat Modal */}
      <Modal visible={!!showChat} animationType="slide" transparent>
        <View style={styles.chatModal}>
          <SafeAreaView style={styles.chatSafe}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => { setShowChat(null); loadData(); }}>
                <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatName}>{showChat?.name}</Text>
                {showChat?.type === 'group' && showChat?.members && (
                  <Text style={styles.chatMembers}>{showChat.members.length} members</Text>
                )}
              </View>
            </View>

            {/* Messages */}
            <ScrollView 
              ref={scrollRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {chatMessages.map((msg, index) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <View key={msg.id || index} style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                    {!isMe && showChat?.type === 'group' && (
                      <Text style={styles.senderName}>{msg.sender_name}</Text>
                    )}
                    <Text style={styles.messageText}>{msg.content}</Text>
                    <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                  </View>
                );
              })}
              {chatMessages.length === 0 && (
                <View style={styles.noMessages}>
                  <Text style={styles.noMessagesText}>No messages yet. Say hi!</Text>
                </View>
              )}
            </ScrollView>

            {/* Message Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, (!newMessage.trim() || sendingMessage) && styles.sendBtnDisabled]} 
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color={Colors.text.primary} />
                  ) : (
                    <Ionicons name="send" size={20} color={Colors.text.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* New Group Modal */}
      <Modal visible={showNewGroup} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity onPress={() => setShowNewGroup(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Group Name *</Text>
              <TextInput
                style={styles.input}
                value={groupForm.name}
                onChangeText={t => setGroupForm({...groupForm, name: t})}
                placeholder="e.g., Accountability Partners"
                placeholderTextColor={Colors.text.tertiary}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                value={groupForm.description}
                onChangeText={t => setGroupForm({...groupForm, description: t})}
                placeholder="What's this group about?"
                placeholderTextColor={Colors.text.tertiary}
                multiline
              />

              <Text style={styles.inputLabel}>Add Members *</Text>
              <View style={styles.membersWrap}>
                {members.filter(m => m.user_id !== user?.id).map(m => (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[styles.memberChip, groupForm.member_ids.includes(m.user_id) && styles.memberChipActive]}
                    onPress={() => {
                      const ids = groupForm.member_ids;
                      const newIds = ids.includes(m.user_id) ? ids.filter(id => id !== m.user_id) : [...ids, m.user_id];
                      setGroupForm({...groupForm, member_ids: newIds});
                    }}
                  >
                    <Text style={[styles.memberChipText, groupForm.member_ids.includes(m.user_id) && styles.memberChipTextActive]}>
                      {m.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, (!groupForm.name.trim() || groupForm.member_ids.length === 0) && styles.createBtnDisabled]}
                onPress={createGroup}
                disabled={!groupForm.name.trim() || groupForm.member_ids.length === 0}
              >
                <Text style={styles.createBtnText}>Create Group</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, marginBottom: 12 },
  pageTitle: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.text.primary, letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.bg.card },
  tabActive: { backgroundColor: Colors.brand.primary + '20', borderWidth: 1, borderColor: Colors.brand.primary },
  tabText: { color: Colors.text.tertiary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.brand.primary },

  // Conversation List
  conversationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.bg.card, borderRadius: Radius.md, marginBottom: 8, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600' },
  convTime: { color: Colors.text.tertiary, fontSize: FontSize.xs },
  convPreview: { color: Colors.text.secondary, fontSize: FontSize.sm, marginTop: 4 },
  unreadBadge: { backgroundColor: Colors.brand.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  unreadText: { color: Colors.text.primary, fontSize: FontSize.xs, fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: Colors.text.secondary, fontSize: FontSize.lg, fontWeight: '600' },
  emptySub: { color: Colors.text.tertiary, fontSize: FontSize.sm },

  // Chat Modal
  chatModal: { flex: 1, backgroundColor: Colors.bg.default },
  chatSafe: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: 12 },
  chatHeaderInfo: { flex: 1 },
  chatName: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  chatMembers: { color: Colors.text.tertiary, fontSize: FontSize.sm },

  messagesContainer: { flex: 1 },
  messagesContent: { paddingHorizontal: 20, paddingVertical: 16 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: Radius.md, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.brand.primary },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: Colors.bg.card },
  senderName: { color: Colors.brand.accent, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4 },
  messageText: { color: Colors.text.primary, fontSize: FontSize.base },
  messageTime: { color: Colors.text.tertiary, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  noMessages: { alignItems: 'center', paddingVertical: 40 },
  noMessagesText: { color: Colors.text.tertiary, fontSize: FontSize.base },

  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border.default, gap: 12 },
  messageInput: { flex: 1, backgroundColor: Colors.bg.input, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, color: Colors.text.primary, fontSize: FontSize.base, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },

  // New Group Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.bg.card, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800' },
  inputLabel: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14, color: Colors.text.primary, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border.default },

  membersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.bg.input, borderWidth: 1, borderColor: Colors.border.default },
  memberChipActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  memberChipText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  memberChipTextActive: { color: Colors.text.primary },

  createBtn: { backgroundColor: Colors.brand.primary, borderRadius: Radius.md, padding: 16, alignItems: 'center', marginTop: 24 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
});

/**
 * Messages Screen — /app/(tabs)/messages.tsx
 * 10xUnicorn Direct & Group Messaging
 * Two-tab interface: Direct Messages + Group Messages
 * ~400 lines
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  FlatList, Image, KeyboardAvoidingView, Platform, Keyboard,
  ActivityIndicator, Modal, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { contacts, interactions } from '../../src/utils/database';
import { Colors, Spacing, BorderRadius, Typography } from '../../src/constants/theme';
import { Contact, Interaction } from '../../src/types/database';

interface DirectMessage {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline?: boolean;
}

interface GroupMessage {
  id: string;
  name: string;
  members: number;
  lastMessage: string;
  timestamp: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  senderName?: string;
  senderAvatar?: string;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [searchText, setSearchText] = useState('');
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<DirectMessage | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadDirectMessages();
    loadGroupMessages();
  }, [user]);

  const loadDirectMessages = async () => {
    if (!user) return;
    try {
      const { data: contactList, error } = await contacts.list(user.id);
      if (!error && contactList) {
        const dmList: DirectMessage[] = (contactList as Contact[])
          .filter(c => c.email || c.phone)
          .map(c => ({
            id: c.id,
            contactId: c.id,
            contactName: c.full_name || 'Unknown',
            contactAvatar: c.avatar_url || undefined,
            lastMessage: 'No messages yet',
            timestamp: new Date().toISOString(),
            unreadCount: 0,
            isOnline: Math.random() > 0.7,
          }));
        setDirectMessages(dmList);
      }
    } catch (err) {
      console.error('Load DM error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMessages = async () => {
    // Placeholder for group messages — would come from group_messages table
    const mockGroups: GroupMessage[] = [
      {
        id: '1',
        name: '10x Founders',
        members: 24,
        lastMessage: 'Sarah shared: "Just hit 6-figure launch"',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        avatar: '👥',
      },
      {
        id: '2',
        name: 'Wormhole Activation',
        members: 5,
        lastMessage: 'You: Thanks for the intro! Setting up call',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        avatar: '🌍',
      },
    ];
    setGroupMessages(mockGroups);
  };

  const handleOpenConversation = (dm: DirectMessage) => {
    setSelectedContact(dm);
    loadConversationHistory(dm.contactId);
  };

  const loadConversationHistory = async (contactId: string) => {
    try {
      const { data: interactionList, error } = await interactions.list(contactId);
      if (!error && interactionList) {
        const history: Message[] = (interactionList as Interaction[])
          .map(i => ({
            id: i.id,
            content: i.description || `${i.type} interaction`,
            timestamp: i.created_at,
            isSent: i.user_id === user?.id,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(history);
      }
    } catch (err) {
      console.error('Load conversation error:', err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !user || !selectedContact) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: text.trim(),
      timestamp: new Date().toISOString(),
      isSent: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    try {
      await interactions.create(user.id, selectedContact.contactId, {
        type: 'text',
        description: text.trim(),
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const filteredDirectMessages = directMessages.filter(dm =>
    dm.contactName.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredGroupMessages = groupMessages.filter(gm =>
    gm.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (selectedContact) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Conversation Header */}
        <View style={styles.conversationHeader}>
          <TouchableOpacity
            onPress={() => setSelectedContact(null)}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.brand.primary} />
          </TouchableOpacity>
          <View style={styles.headerContact}>
            {selectedContact.contactAvatar ? (
              <Image
                source={{ uri: selectedContact.contactAvatar }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {selectedContact.contactName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{selectedContact.contactName}</Text>
              <Text style={styles.headerStatus}>
                {selectedContact.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.isSent ? styles.sentRow : styles.receivedRow,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  item.isSent ? styles.sentBubble : styles.receivedBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.isSent ? styles.sentText : styles.receivedText,
                  ]}
                >
                  {item.content}
                </Text>
              </View>
              <Text style={styles.messageTime}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyText}>No messages yet. Start a conversation!</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.text.tertiary}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageInput.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage(messageInput)}
              disabled={!messageInput.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={messageInput.trim() ? Colors.text.primary : Colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => setShowNewGroupModal(true)}
          style={styles.newButton}
        >
          <Ionicons name="add-circle" size={24} color={Colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('direct')}
          style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>
            Direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('group')}
          style={[styles.tab, activeTab === 'group' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.text.tertiary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : activeTab === 'direct' ? (
        <FlatList
          data={filteredDirectMessages}
          keyExtractor={dm => dm.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => handleOpenConversation(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardAvatar}>
                {item.contactAvatar ? (
                  <Image
                    source={{ uri: item.contactAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.contactName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {item.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contactName}>{item.contactName}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💬</Text>
              <Text style={styles.emptyStateTitle}>No direct messages</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start a conversation with your contacts
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredGroupMessages}
          keyExtractor={gm => gm.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              activeOpacity={0.7}
            >
              <View style={styles.cardAvatar}>
                <View style={styles.groupAvatarPlaceholder}>
                  <Text style={styles.avatarText}>{item.avatar}</Text>
                </View>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  <Text style={styles.memberCount}>{item.members} members</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>👥</Text>
              <Text style={styles.emptyStateTitle}>No group messages</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create or join groups to collaborate
              </Text>
            </View>
          }
        />
      )}

      {/* New Group Modal */}
      <Modal
        visible={showNewGroupModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity onPress={() => setShowNewGroupModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.modalInput}
                placeholder="Group name"
                placeholderTextColor={Colors.text.tertiary}
              />
              <Text style={styles.modalLabel}>Add members</Text>
              {directMessages.slice(0, 5).map(dm => (
                <TouchableOpacity
                  key={dm.id}
                  style={styles.memberOption}
                >
                  <View style={styles.optionAvatar}>
                    <Text style={styles.optionAvatarText}>
                      {dm.contactName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{dm.contactName}</Text>
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={Colors.brand.primary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCreateButton}
              onPress={() => setShowNewGroupModal(false)}
            >
              <Text style={styles.modalCreateButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  newButton: {
    padding: Spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginRight: Spacing.lg,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.primary,
  },
  tabText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  conversationCard: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  cardAvatar: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background.elevated,
    borderWidth: 2,
    borderColor: Colors.border.glow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.status.success,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  contactName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    flex: 1,
  },
  timestamp: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    ...Typography.caption,
    color: Colors.text.secondary,
    flex: 1,
  },
  memberCount: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm,
  },
  unreadBadge: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.md,
  },
  unreadText: {
    ...Typography.small,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.lg,
  },
  headerContact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarInitial: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  headerName: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  headerStatus: {
    ...Typography.small,
    color: Colors.text.tertiary,
  },
  callButton: {
    padding: Spacing.md,
  },
  messagesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  messageRow: {
    marginVertical: Spacing.sm,
    flexDirection: 'row',
  },
  sentRow: {
    justifyContent: 'flex-end',
  },
  receivedRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sentBubble: {
    backgroundColor: Colors.brand.primary,
  },
  receivedBubble: {
    backgroundColor: Colors.background.elevated,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  messageText: {
    ...Typography.body,
  },
  sentText: {
    color: Colors.text.primary,
  },
  receivedText: {
    color: Colors.text.primary,
  },
  messageTime: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border.default,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.background.input,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    ...Typography.captionBold,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  memberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  optionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  optionAvatarText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  optionText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  modalCreateButton: {
    backgroundColor: Colors.brand.primary,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalCreateButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
});

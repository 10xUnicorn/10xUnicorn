/**
 * AI Chat Modal — /app/ai-chat.tsx
 * 10xUnicorn AI Companion chat interface (modal presentation)
 * Receives date context via router params
 * ~350 lines
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import {
  sendAIMessage, buildAIContext, getSuggestedPrompts,
} from '../src/utils/ai-companion';
import { profiles, goals, dailyEntries, aiSessions } from '../src/utils/database';
import { Colors, Spacing, BorderRadius, Typography } from '../src/constants/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    if (!user) {
      setInitError('User not authenticated');
      setInitializing(false);
      return;
    }

    try {
      // Get or create AI session for this date
      const { data: existingSession, error: sessionError } = await aiSessions.getByDate(user.id, date);

      if (sessionError && sessionError.code !== 'PGRST116') {
        // PGRST116 is "no rows found" which is expected for new dates
        throw new Error(`Failed to load session: ${sessionError.message}`);
      }

      if (existingSession) {
        setSessionId(existingSession.id);
        // Load previous messages
        const { data: msgs, error: msgError } = await aiSessions.getMessages(existingSession.id);
        if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`);
        if (msgs) {
          setMessages(
            msgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          );
        }
      } else {
        // Create new session
        const { data: newSession, error: createError } = await aiSessions.create(user.id, 'course_correction');
        if (createError) throw new Error(`Failed to create session: ${createError.message}`);
        if (newSession) {
          setSessionId(newSession.id);
        }
      }

      // Load context for suggested prompts
      const { data: profile, error: profileError } = await profiles.get(user.id);
      if (profileError) throw new Error(`Failed to load profile: ${profileError.message}`);

      const { data: goal, error: goalError } = await goals.getActive(user.id);
      // goalError might be "no rows" which is okay
      if (goalError && goalError.code !== 'PGRST116') {
        throw new Error(`Failed to load goal: ${goalError.message}`);
      }

      const { data: entry, error: entryError } = await dailyEntries.getByDate(user.id, date);
      // entryError might be "no rows" which is okay
      if (entryError && entryError.code !== 'PGRST116') {
        throw new Error(`Failed to load daily entry: ${entryError.message}`);
      }

      setSuggestedPrompts(getSuggestedPrompts(entry));
      setInitError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize chat';
      console.error('Chat init error:', err);
      setInitError(errorMsg);
    } finally {
      setInitializing(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user || !sessionId) {
      if (!sessionId) {
        setInitError('Chat session not ready. Please wait a moment and try again.');
      }
      return;
    }

    const userMessage = text.trim();
    setInputText('');

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Build AI context
      const { data: profile, error: profileError } = await profiles.get(user.id);
      if (profileError) throw new Error(`Failed to load profile: ${profileError.message}`);

      const { data: goal, error: goalError } = await goals.getActive(user.id);
      if (goalError && goalError.code !== 'PGRST116') {
        throw new Error(`Failed to load goal: ${goalError.message}`);
      }

      const { data: entry, error: entryError } = await dailyEntries.getByDate(user.id, date);
      if (entryError && entryError.code !== 'PGRST116') {
        throw new Error(`Failed to load daily entry: ${entryError.message}`);
      }

      const context = buildAIContext(profile, goal, entry);

      // Send to AI companion
      const response = await sendAIMessage(sessionId, userMessage, messages, context);

      if (response.error) {
        const errorMessage = response.error.includes('ai-companion')
          ? 'The AI Companion is currently unavailable. Please try again in a moment.'
          : `I encountered an issue: ${response.error}. Let's try again.`;
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessage,
          },
        ]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection issue. Please try again.';
      console.error('Send message error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
        },
      ]);
    } finally {
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleDone = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <LinearGradient
        colors={Colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>10x Companion</Text>
            <Text style={styles.headerSubtitle}>Course Correction Coach</Text>
          </View>
          <TouchableOpacity
            onPress={handleDone}
            style={styles.doneButton}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }}
      >
        {initializing && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
            <Text style={[styles.emptyStateTitle, { marginTop: Spacing.lg }]}>Loading Chat</Text>
            <Text style={styles.emptyStateSubtitle}>Getting your session ready...</Text>
          </View>
        )}

        {initError && !initializing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>⚠️</Text>
            <Text style={styles.emptyStateTitle}>Chat Error</Text>
            <Text style={styles.emptyStateSubtitle}>{initError}</Text>
            <TouchableOpacity
              onPress={() => {
                setInitError(null);
                setInitializing(true);
                initializeChat();
              }}
              style={[styles.suggestedPrompt, { marginTop: Spacing.lg }]}
            >
              <Text style={styles.suggestedPromptText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {messages.length === 0 && !loading && !initializing && !initError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🦄</Text>
            <Text style={styles.emptyStateTitle}>Let's Execute</Text>
            <Text style={styles.emptyStateSubtitle}>
              I'm here to help you course-correct and stay locked on your 10x goal
            </Text>
          </View>
        )}

        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageRow,
              msg.role === 'user' ? styles.userRow : styles.assistantRow,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user'
                    ? styles.userMessageText
                    : styles.assistantMessageText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.messageRow}>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Prompts */}
      {messages.length === 0 && suggestedPrompts.length > 0 && !loading && !initializing && !initError && (
        <View style={styles.suggestedContainer}>
          <Text style={styles.suggestedLabel}>Quick Start</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedContent}
          >
            {suggestedPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestedPrompt}
                onPress={() => handleSuggestedPrompt(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestedPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      {!initializing && !initError && (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading && !initializing && !initError}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || loading || !sessionId}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>›</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.charCount}>{inputText.length}/500</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  doneButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  doneButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  messageRow: {
    marginVertical: Spacing.sm,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.brand.primary,
  },
  assistantBubble: {
    backgroundColor: Colors.background.elevated,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  messageText: {
    ...Typography.body,
  },
  userMessageText: {
    color: Colors.text.primary,
  },
  assistantMessageText: {
    color: Colors.text.primary,
  },
  suggestedContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  suggestedLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  suggestedContent: {
    paddingRight: Spacing.lg,
  },
  suggestedPrompt: {
    backgroundColor: Colors.background.elevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.glow,
  },
  suggestedPromptText: {
    ...Typography.caption,
    color: Colors.text.secondary,
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
  sendButtonText: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  charCount: {
    ...Typography.small,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});

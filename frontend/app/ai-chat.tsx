import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/utils/api';
import { Colors, Radius, FontSize } from '../src/constants/theme';

type Message = { role: 'user' | 'assistant'; text: string };

export default function AIChatScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadExistingSession();
  }, []);

  const loadExistingSession = async () => {
    try {
      const sessions = await api.get(`/ai-session/by-date/${date || new Date().toISOString().split('T')[0]}`);
      if (sessions.length > 0) {
        const latest = sessions[0];
        setSessionId(latest.id);
        setMessages(latest.conversation_log.map((m: any) => ({ role: m.role, text: m.text })));
        setSessionComplete(latest.marked_complete);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      let response;
      if (!sessionId) {
        const res = await api.post('/ai-session/start', {
          message: text,
          date: date || new Date().toISOString().split('T')[0],
        });
        setSessionId(res.session_id);
        response = res.response;
      } else {
        const res = await api.post(`/ai-session/${sessionId}/message`, {
          message: text,
        });
        response = res.response;
      }
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Sorry, something went wrong. ${e.message || 'Please try again.'}`
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/ai-session/${sessionId}/complete`);
      setSessionComplete(true);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="ai-chat-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={20} color={Colors.brand.primary} />
          <Text style={styles.headerTitle}>AI Course Correction</Text>
        </View>
        {sessionId && !sessionComplete && (
          <TouchableOpacity testID="complete-session-btn" onPress={completeSession} style={styles.completeBtn}>
            <Text style={styles.completeBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {sessionComplete && (
        <View style={styles.completeBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.status.success} />
          <Text style={styles.completeBannerText}>Session completed - Day marked as course corrected</Text>
        </View>
      )}

      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.welcome}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={32} color={Colors.brand.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Course Correction Coach</Text>
                <Text style={styles.welcomeText}>
                  Tell me about your day. What happened? What blocked you? I'll help you course-correct and still make today count.
                </Text>
                <View style={styles.prompts}>
                  {[
                    "I didn't complete my top priority today",
                    "I got distracted and lost focus",
                    "I need help getting back on track",
                  ].map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      testID={`prompt-${i}`}
                      style={styles.promptBtn}
                      onPress={() => { setInput(p); }}
                    >
                      <Text style={styles.promptText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((m, i) => (
              <View key={i} style={[styles.msgBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                {m.role === 'assistant' && (
                  <View style={styles.aiLabel}>
                    <Ionicons name="sparkles" size={12} color={Colors.brand.primary} />
                    <Text style={styles.aiLabelText}>10x Coach</Text>
                  </View>
                )}
                <Text style={[styles.msgText, m.role === 'user' && styles.userMsgText]}>{m.text}</Text>
              </View>
            ))}

            {loading && (
              <View style={[styles.msgBubble, styles.aiBubble]}>
                <ActivityIndicator size="small" color={Colors.brand.primary} />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              testID="ai-chat-input"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={sessionComplete ? 'Session completed' : 'Type your message...'}
              placeholderTextColor={Colors.text.tertiary}
              editable={!sessionComplete}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              testID="ai-chat-send-btn"
              style={[styles.sendBtn, (!input.trim() || loading || sessionComplete) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading || sessionComplete}
            >
              <Ionicons name="send" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.default },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700' },
  completeBtn: {
    backgroundColor: Colors.status.success, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  completeBtnText: { color: Colors.text.inverse, fontWeight: '700', fontSize: FontSize.sm },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(0,255,157,0.1)', paddingVertical: 10,
  },
  completeBannerText: { color: Colors.status.success, fontSize: FontSize.sm },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingVertical: 40 },
  aiIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(127,0,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  welcomeTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: 8 },
  welcomeText: { color: Colors.text.secondary, fontSize: FontSize.base, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 24 },
  prompts: { gap: 8, width: '100%' },
  promptBtn: {
    backgroundColor: Colors.bg.card, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  promptText: { color: Colors.text.secondary, fontSize: FontSize.sm },
  msgBubble: { marginBottom: 12, borderRadius: Radius.lg, padding: 14, maxWidth: '85%' },
  userBubble: { backgroundColor: Colors.brand.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.bg.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border.default },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  aiLabelText: { color: Colors.brand.primary, fontSize: FontSize.xs, fontWeight: '600' },
  msgText: { color: Colors.text.primary, fontSize: FontSize.base, lineHeight: 22 },
  userMsgText: { color: Colors.text.primary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border.default, gap: 8,
    backgroundColor: Colors.bg.default,
  },
  input: {
    flex: 1, backgroundColor: Colors.bg.input, borderRadius: Radius.md, padding: 14,
    color: Colors.text.primary, fontSize: FontSize.base, maxHeight: 120,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.brand.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});

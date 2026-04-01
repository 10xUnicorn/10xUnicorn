/**
 * Database Helper — Supabase Queries
 * Replaces: All FastAPI /api/* endpoint calls
 *
 * Organized by domain. Every function returns { data, error }.
 * Frontend screens call these instead of api.get/post/put/delete.
 */

import { supabase } from './supabase';
import {
  Profile, Goal, Contact, ContactNote, Interaction,
  Signal, Deal, DailyEntry, AiSession, AiMessage,
  Streak, Points, SignalType, SignalStatus, DealStage,
  ContactType, InteractionType, DayStatus,
} from '../types/database';

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

export const profiles = {
  async get(userId: string) {
    return supabase.from('profiles').select('*').eq('id', userId).single();
  },

  async update(userId: string, updates: Partial<Profile>) {
    return supabase.from('profiles').update(updates).eq('id', userId).select().single();
  },

  /** Complete onboarding — set name, goal, habit, timezone */
  async completeOnboarding(userId: string, data: {
    displayName: string;
    timezone: string;
    goalTitle: string;
    goalDescription?: string;
    habitName?: string;
    dailyCompoundTarget?: number;
  }) {
    // Update profile
    const { error: profError } = await supabase.from('profiles').update({
      display_name: data.displayName,
      full_name: data.displayName,
      timezone: data.timezone,
      onboarding_completed: true,
      daily_compound_target: data.dailyCompoundTarget || 1,
    }).eq('id', userId);

    if (profError) return { data: null, error: profError };

    // Create goal
    const { error: goalError } = await supabase.from('goals').insert({
      user_id: userId,
      title: data.goalTitle,
      description: data.goalDescription || null,
      status: 'active',
      progress: 0,
    });

    return { data: true, error: goalError };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════════

export const goals = {
  async getActive(userId: string) {
    return supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  },

  async update(goalId: string, updates: Partial<Goal>) {
    return supabase.from('goals').update(updates).eq('id', goalId).select().single();
  },

  async create(userId: string, data: { title: string; description?: string; target_date?: string; target_number?: number }) {
    return supabase.from('goals').insert({
      user_id: userId,
      title: data.title,
      description: data.description || null,
      target_date: data.target_date || null,
      target_number: data.target_number || null,
      status: 'active',
      progress: 0,
    }).select().single();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS (Unified — includes Wormhole)
// ═══════════════════════════════════════════════════════════════════════════════

export const contacts = {
  async list(userId: string, opts?: { wormholeOnly?: boolean; type?: ContactType; search?: string }) {
    let query = supabase.from('contacts').select('*').eq('user_id', userId);

    if (opts?.wormholeOnly) query = query.eq('is_wormhole', true);
    if (opts?.type) query = query.eq('type', opts.type);
    if (opts?.search) query = query.ilike('full_name', `%${opts.search}%`);

    return query.order('created_at', { ascending: false });
  },

  async get(contactId: string) {
    return supabase.from('contacts').select('*').eq('id', contactId).single();
  },

  async create(userId: string, data: Partial<Contact>) {
    return supabase.from('contacts').insert({
      user_id: userId,
      full_name: data.full_name || 'Unknown',
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      title: data.title || null,
      type: data.type || 'prospect',
      is_wormhole: data.is_wormhole ?? false,
      connection_level: data.connection_level || null,
      details: data.details || null,
      linkedin_url: data.linkedin_url || null,
      twitter_url: data.twitter_url || null,
      instagram_url: data.instagram_url || null,
      avatar_url: data.avatar_url || null,
      engagement_tags: data.engagement_tags || null,
      reciprocity_notes: data.reciprocity_notes || null,
      extra_fields: data.extra_fields || null,
    }).select().single();
  },

  async update(contactId: string, updates: Partial<Contact>) {
    return supabase.from('contacts').update(updates).eq('id', contactId).select().single();
  },

  async delete(contactId: string) {
    return supabase.from('contacts').delete().eq('id', contactId);
  },

  async bulkImport(userId: string, contactList: Array<{ name: string; phone?: string; email?: string; type?: ContactType }>) {
    const rows = contactList.map(c => ({
      user_id: userId,
      full_name: c.name,
      phone: c.phone || null,
      email: c.email || null,
      type: c.type || 'prospect' as ContactType,
      is_wormhole: false,
    }));
    return supabase.from('contacts').insert(rows).select();
  },

  /** Top wormhole contacts by connection level */
  async topWormhole(userId: string, limit = 3) {
    return supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_wormhole', true)
      .order('connection_level', { ascending: false })
      .limit(limit);
  },

  /** Get all wormhole contacts for a user */
  async getWormhole(userId: string) {
    return supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_wormhole', true)
      .order('created_at', { ascending: false });
  },
};

// ─── Contact Notes ───────────────────────────────────────────────────────────

export const contactNotes = {
  async list(contactId: string) {
    return supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
  },

  async create(userId: string, contactId: string, content: string) {
    return supabase.from('contact_notes').insert({
      user_id: userId,
      contact_id: contactId,
      content,
    }).select().single();
  },

  async update(noteId: string, content: string) {
    return supabase.from('contact_notes').update({ content }).eq('id', noteId).select().single();
  },
};

// ─── Interactions ────────────────────────────────────────────────────────────

export const interactions = {
  async list(contactId: string) {
    return supabase
      .from('interactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
  },

  async create(userId: string, contactId: string, data: {
    type: InteractionType;
    description?: string;
    impact_rating?: number;
  }) {
    return supabase.from('interactions').insert({
      user_id: userId,
      contact_id: contactId,
      type: data.type,
      description: data.description || null,
      impact_rating: data.impact_rating || null,
    }).select().single();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

export const signals = {
  async list(userId: string, opts?: { status?: SignalStatus; type?: SignalType }) {
    let query = supabase.from('signals').select('*').eq('user_id', userId);

    if (opts?.status) query = query.eq('status', opts.status);
    if (opts?.type) query = query.eq('type', opts.type);

    return query.order('created_at', { ascending: false });
  },

  async get(signalId: string) {
    return supabase.from('signals').select('*').eq('id', signalId).single();
  },

  async getByDate(userId: string, date: string) {
    // Match signals where due_date is the plain date string (YYYY-MM-DD)
    // or falls within the date range (for legacy ISO datetime values)
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    return supabase
      .from('signals')
      .select('*')
      .eq('user_id', userId)
      .or(`due_date.eq.${date},and(due_date.gte.${startOfDay},due_date.lte.${endOfDay})`)
      .order('created_at', { ascending: false });
  },

  async create(userId: string, data: Partial<Signal>) {
    return supabase.from('signals').insert({
      user_id: userId,
      title: data.title || '',
      details: data.details || null,
      type: data.type || 'revenue_generating',
      status: 'not_started' as SignalStatus,
      due_date: data.due_date || null,
      score: data.score || null,
      is_public: data.is_public ?? false,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || null,
      duration_minutes: data.duration_minutes || null,
    }).select().single();
  },

  async update(signalId: string, updates: Partial<Signal>) {
    return supabase.from('signals').update(updates).eq('id', signalId).select().single();
  },

  async delete(signalId: string) {
    return supabase.from('signals').delete().eq('id', signalId);
  },

  async complete(signalId: string, userId: string) {
    // Update signal status
    const { data: signal, error: sigErr } = await supabase
      .from('signals')
      .update({ status: 'complete' as SignalStatus })
      .eq('id', signalId)
      .select()
      .single();

    if (sigErr) return { data: null, error: sigErr };

    // Award points
    const basePoints = signal?.score ? signal.score * 10 : 10;
    const { error: ptErr } = await supabase.from('points').insert({
      user_id: userId,
      amount: basePoints,
      reason: 'signal_complete',
      reference_id: signalId,
    });

    return { data: signal, error: ptErr };
  },

  async uncomplete(signalId: string, userId: string) {
    // Revert signal status
    const { error: sigErr } = await supabase
      .from('signals')
      .update({ status: 'not_started' as SignalStatus })
      .eq('id', signalId);

    if (sigErr) return { data: null, error: sigErr };

    // Remove awarded points
    const { error: ptErr } = await supabase
      .from('points')
      .delete()
      .eq('reference_id', signalId)
      .eq('user_id', userId);

    return { data: null, error: ptErr };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEALS
// ═══════════════════════════════════════════════════════════════════════════════

export const deals = {
  async list(userId: string, stage?: DealStage) {
    let query = supabase.from('deals').select('*, contacts(full_name, company)').eq('user_id', userId);
    if (stage) query = query.eq('stage', stage);
    return query.order('created_at', { ascending: false });
  },

  async get(dealId: string) {
    return supabase.from('deals').select('*, contacts(full_name, company, email, phone)').eq('id', dealId).single();
  },

  async create(userId: string, data: Partial<Deal>) {
    return supabase.from('deals').insert({
      user_id: userId,
      title: data.title || '',
      value: data.value || null,
      stage: data.stage || 'lead',
      contact_id: data.contact_id || null,
      expected_close_date: data.expected_close_date || null,
      details: data.details || null,
      service_needs: data.service_needs || null,
    }).select().single();
  },

  async update(dealId: string, updates: Partial<Deal>) {
    return supabase.from('deals').update(updates).eq('id', dealId).select().single();
  },

  async delete(dealId: string) {
    return supabase.from('deals').delete().eq('id', dealId);
  },

  /** Pipeline summary: total value, won value, counts */
  async summary(userId: string) {
    const { data, error } = await supabase.from('deals').select('value, stage').eq('user_id', userId);
    if (error || !data) return { data: null, error };

    const pipelineValue = data.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0);
    const wonValue = data.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.value || 0), 0);
    const dealCount = data.length;

    return { data: { pipelineValue, wonValue, dealCount }, error: null };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY ENTRIES
// ═══════════════════════════════════════════════════════════════════════════════

export const dailyEntries = {
  async getByDate(userId: string, date: string) {
    return supabase
      .from('daily_entries')
      .select('*, contacts:wormhole_contact_id(id, full_name)')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .single();
  },

  /** Get or create entry for a date */
  async getOrCreate(userId: string, date: string) {
    const { data: existing, error: fetchErr } = await supabase
      .from('daily_entries')
      .select('*, contacts:wormhole_contact_id(id, full_name)')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .maybeSingle();

    if (fetchErr) return { data: null, error: fetchErr };
    if (existing) return { data: existing, error: null };

    // Create new entry
    const { data: created, error: createErr } = await supabase.from('daily_entries').insert({
      user_id: userId,
      entry_date: date,
      determination_level: 5,
      status: 'not_prepared' as DayStatus,
      ten_x_action_completed: false,
      compound_count: 0,
      future_self_completed: false,
      checklist: [],
    }).select('*, contacts:wormhole_contact_id(id, full_name)').single();

    return { data: created, error: createErr };
  },

  async update(entryId: string, updates: Partial<DailyEntry>) {
    return supabase.from('daily_entries').update(updates).eq('id', entryId).select().single();
  },

  /** Recent entries for dashboard charts */
  async recent(userId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    return supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', dateStr)
      .order('entry_date', { ascending: true });
  },

  /** Heatmap data — last N weeks of entries */
  async heatmap(userId: string, weeks = 52) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));
    const dateStr = startDate.toISOString().split('T')[0];

    return supabase
      .from('daily_entries')
      .select('entry_date, determination_level, compound_count, ten_x_action_completed')
      .eq('user_id', userId)
      .gte('entry_date', dateStr)
      .order('entry_date', { ascending: true });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI SESSIONS (10xUnicorn AI Companion)
// ═══════════════════════════════════════════════════════════════════════════════

export const aiSessions = {
  async getByDate(userId: string, date: string) {
    // Get sessions created on this date
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    return supabase
      .from('ai_sessions')
      .select('*, ai_messages(*)')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  },

  async create(userId: string, sessionType = 'course_correction') {
    return supabase.from('ai_sessions').insert({
      user_id: userId,
      session_type: sessionType,
      is_complete: false,
    }).select().single();
  },

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    return supabase.from('ai_messages').insert({
      session_id: sessionId,
      role,
      content,
    }).select().single();
  },

  async getMessages(sessionId: string) {
    return supabase
      .from('ai_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
  },

  async markComplete(sessionId: string) {
    return supabase.from('ai_sessions').update({ is_complete: true }).eq('id', sessionId);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// POINTS & STREAKS
// ═══════════════════════════════════════════════════════════════════════════════

export const pointsDb = {
  async summary(userId: string) {
    const { data, error } = await supabase
      .from('points')
      .select('amount, created_at')
      .eq('user_id', userId);

    if (error || !data) return { data: null, error };

    const total = data.reduce((sum, p) => sum + p.amount, 0);

    // Weekly points (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekly = data
      .filter(p => new Date(p.created_at) >= weekAgo)
      .reduce((sum, p) => sum + p.amount, 0);

    return { data: { total, weekly }, error: null };
  },

  async leaderboard(limit = 50) {
    // Aggregate points by user, join profiles
    const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: limit });

    // Fallback if RPC not available — direct query
    if (error) {
      const { data: points, error: ptErr } = await supabase
        .from('points')
        .select('user_id, amount, profiles!inner(display_name, full_name, avatar_url, emoji)')
        .order('amount', { ascending: false });

      if (ptErr || !points) return { data: [], error: ptErr };

      // Aggregate manually
      const userMap: Record<string, { user_id: string; total: number; display_name: string; avatar_url: string | null; emoji: string | null }> = {};
      for (const pt of points as any[]) {
        if (!userMap[pt.user_id]) {
          userMap[pt.user_id] = {
            user_id: pt.user_id,
            total: 0,
            display_name: pt.profiles?.display_name || pt.profiles?.full_name || 'Anonymous',
            avatar_url: pt.profiles?.avatar_url || null,
            emoji: pt.profiles?.emoji || null,
          };
        }
        userMap[pt.user_id].total += pt.amount;
      }

      const sorted = Object.values(userMap).sort((a, b) => b.total - a.total).slice(0, limit);
      return { data: sorted, error: null };
    }

    return { data, error };
  },

  async award(userId: string, amount: number, reason: string, referenceId?: string) {
    return supabase.from('points').insert({
      user_id: userId,
      amount,
      reason,
      reference_id: referenceId || null,
    });
  },
};

export const streaks = {
  async get(userId: string) {
    return supabase.from('streaks').select('*').eq('user_id', userId);
  },

  async getCurrent(userId: string) {
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', 'compound')
      .maybeSingle();
    return data ? { count: data.current_count || 0 } : { count: 0 };
  },

  async getBest(userId: string) {
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', 'compound')
      .maybeSingle();
    return data ? { count: data.longest_count || 0 } : { count: 0 };
  },

  async update(userId: string, streakType: string, updates: Partial<Streak>) {
    return supabase
      .from('streaks')
      .update(updates)
      .eq('user_id', userId)
      .eq('streak_type', streakType);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY
// ═══════════════════════════════════════════════════════════════════════════════

function getActivityTitle(reason: string): string {
  const titles: Record<string, string> = {
    '10x_action_completed': 'Completed their 10x Action',
    'future_self_completed': 'Wrote to their Future Self',
    'daily_compound_increment': 'Added to Daily Compound',
    'wormhole_activated': 'Activated a Wormhole Connection',
    'tomorrow_prepared': 'Prepared for Tomorrow',
    'course_corrected': 'Course Corrected',
    'determination_level_10': 'Hit Determination Level 10',
    '10x_unicorn_win_bonus': '10x Unicorn WIN',
    'signal_complete': 'Completed a Signal',
    'signal_revenue_generating_completed': 'Completed Revenue Signal',
    'signal_10x_action_completed': 'Completed 10x Signal',
    'signal_marketing_completed': 'Completed Marketing Signal',
    'signal_relational_completed': 'Completed Relational Signal',
    'signal_general_business_completed': 'Completed Business Signal',
    'daily_compound_target_hit': 'Hit Daily Compound Target',
    'goal_progress': 'Advanced 10x Goal Progress',
    'streak_milestone': 'Hit a Streak Milestone',
    'planned_ahead': 'Planned Ahead',
    'before_6pm': 'Completed Before 6 PM',
  };
  return titles[reason] || reason.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export const community = {
  async members(search?: string) {
    let query = supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, emoji, company, bio, services_offered, industries')
      .eq('onboarding_completed', true);

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%`);
    }

    return query.order('created_at', { ascending: false });
  },

  async getMember(userId: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  },

  async getLeaderboard(limit = 50) {
    // Get all profiles with their points totals
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, emoji')
      .eq('onboarding_completed', true);

    if (profilesErr || !profiles) return { data: null, error: profilesErr };

    // Get points for each profile
    const { data: allPoints } = await supabase.from('points').select('user_id, amount');
    const { data: allStreaks } = await supabase.from('streaks').select('user_id, current_count, streak_type');

    const pointsByUser: Record<string, number> = {};
    (allPoints || []).forEach((p) => {
      pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.amount;
    });

    const streaksByUser: Record<string, number> = {};
    (allStreaks || []).filter(s => s.streak_type === 'compound').forEach((s) => {
      streaksByUser[s.user_id] = s.current_count || 0;
    });

    const leaderboard = profiles
      .map((profile) => ({
        profile,
        total_points: pointsByUser[profile.id] || 0,
        current_streak: streaksByUser[profile.id] || 0,
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit);

    return { data: leaderboard, error: null };
  },

  async getActivityFeed(limit = 30) {
    // Get recent points entries as activity feed (covers all action types)
    const { data: recentPoints, error } = await supabase
      .from('points')
      .select('*, profiles:user_id(display_name, full_name, avatar_url, emoji)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback: just get completed signals
      const { data: recentSignals, error: sigErr } = await supabase
        .from('signals')
        .select('*, profiles:user_id(display_name, full_name, avatar_url, emoji)')
        .eq('status', 'complete')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (sigErr) return { data: null, error: sigErr };

      const feed = (recentSignals || []).map((signal) => ({
        id: signal.id,
        user: signal.profiles,
        action: `Completed "${signal.title}"`,
        type: signal.type,
        points: signal.score || 0,
        timestamp: signal.updated_at,
        title: signal.title,
      }));
      return { data: feed, error: null };
    }

    const feed = (recentPoints || []).map((pt) => ({
      id: pt.id,
      user: pt.profiles,
      action: pt.reason,
      type: pt.reason,
      points: pt.amount || 0,
      timestamp: pt.created_at,
      title: getActivityTitle(pt.reason),
    }));

    return { data: feed, error: null };
  },

  async getDirectory() {
    return supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, emoji, company, bio, services_offered, industries')
      .eq('onboarding_completed', true)
      .order('display_name', { ascending: true });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE (Supabase Storage — replaces Emergent Object Storage)
// ═══════════════════════════════════════════════════════════════════════════════

export const storage = {
  async uploadAvatar(userId: string, file: { uri: string; type: string; name: string }) {
    const filePath = `${userId}/avatar.${file.name.split('.').pop()}`;

    // Convert URI to blob for upload
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: file.type,
        upsert: true,
      });

    if (error) return { data: null, error };

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // Update profile
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userId);

    return { data: urlData.publicUrl, error: null };
  },

  async uploadAttachment(userId: string, file: { uri: string; type: string; name: string }) {
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const response = await fetch(file.uri);
    const blob = await response.blob();

    return supabase.storage.from('attachments').upload(filePath, blob, {
      contentType: file.type,
    });
  },

  getAvatarUrl(path: string) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },
};

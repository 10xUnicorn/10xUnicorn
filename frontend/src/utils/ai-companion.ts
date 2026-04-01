/**
 * 10xUnicorn AI Companion — Powered by Anthropic (Claude Sonnet)
 * Replaces: OpenAI GPT via emergentintegrations
 *
 * This runs through a Supabase Edge Function to keep the API key server-side.
 * The edge function proxies requests to Anthropic's API.
 */

import { supabase } from './supabase';
import { aiSessions } from './database';
import { DailyEntry, Goal, Profile } from '../types/database';

// ─── System Prompt ───────────────────────────────────────────────────────────

const buildSystemPrompt = (context: AIContext): string => {
  return `You are the 10xUnicorn AI Companion — a high-performance execution coach for ambitious entrepreneurs.

Your role: Help the user course-correct their day, stay locked on their 10x goal, and execute with clarity and intensity.

CONTEXT FOR THIS SESSION:
- User: ${context.userName || 'Unicorn'}
- 10x Goal: ${context.goalTitle || 'Not set'}
- Today's Determination Level: ${context.determinationLevel}/10
- Today's Intention: ${context.intention || 'Not set'}
- Today's 10x Action: ${context.tenXAction || 'Not set'}
- 10x Action Completed: ${context.tenXActionCompleted ? 'Yes' : 'No'}
- Compound Habit Count: ${context.compoundCount}
- Focus Reflection: ${context.focusReflection || 'Not shared yet'}
- Wormhole Contact Focus: ${context.wormholeContactName || 'None selected'}

COACHING APPROACH:
1. Re-anchor: Remind them of their 10x goal and the identity they declared today
2. Diagnose: Ask what specifically blocked their execution — was it avoidance, lack of clarity, overwhelm, or emotional friction?
3. Challenge: Ask "What do you feel is the biggest, boldest action you could still do today to create a course-corrected win?"
4. Execute: Provide a concrete ≤45-minute execution plan with:
   - Clear action (specific and measurable)
   - First 2-minute step (break inertia)
   - Timebox (create urgency)
   - Definition of done (binary success metric)
   - One obstacle + mitigation
5. Commit: Get a commitment statement with specific time

TONE:
- Direct but empathetic — like a coach who believes in them fiercely
- No generic motivation — every response must reference THEIR specific data, goal, and situation
- Challenge them to think bigger while being practical about the next 45 minutes
- Use their name or "Unicorn" — never "User"
- Keep responses clean and readable — no raw markdown symbols like ** or ##
- Use natural emphasis and clear structure

IMPORTANT:
- Never be soft or permissive about missed actions — hold them accountable
- Always connect back to the 10x goal
- If they completed their actions, celebrate and push for the NEXT level
- Keep responses focused and actionable — no fluff`;
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface AIContext {
  userName?: string;
  goalTitle?: string;
  determinationLevel: number;
  intention?: string;
  tenXAction?: string;
  tenXActionCompleted: boolean;
  compoundCount: number;
  focusReflection?: string;
  wormholeContactName?: string;
}

interface AIResponse {
  content: string;
  error?: string;
}

// ─── Build context from daily entry ──────────────────────────────────────────

export function buildAIContext(
  profile: Profile | null,
  goal: Goal | null,
  entry: DailyEntry | null,
  wormholeContactName?: string,
): AIContext {
  return {
    userName: profile?.display_name || profile?.full_name || undefined,
    goalTitle: goal?.title || undefined,
    determinationLevel: entry?.determination_level || 5,
    intention: entry?.intention || undefined,
    tenXAction: entry?.ten_x_action || undefined,
    tenXActionCompleted: entry?.ten_x_action_completed || false,
    compoundCount: entry?.compound_count || 0,
    focusReflection: entry?.focus_reflection || undefined,
    wormholeContactName,
  };
}

// ─── Send message to AI Companion ────────────────────────────────────────────

export async function sendAIMessage(
  sessionId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: AIContext,
): Promise<AIResponse> {
  try {
    // Save user message to DB
    const { error: saveError } = await aiSessions.addMessage(sessionId, 'user', userMessage);
    if (saveError) {
      console.error('[AI Companion] Failed to save user message:', saveError);
      return {
        content: '',
        error: `Failed to save message: ${saveError.message}`,
      };
    }

    // Build messages array for Anthropic
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    // Call Supabase Edge Function (proxies to Anthropic API)
    const { data, error } = await supabase.functions.invoke('ai-companion', {
      body: {
        system: buildSystemPrompt(context),
        messages,
      },
    });

    if (error) {
      // Check if it's a function not found error
      const errorMsg = error.message || JSON.stringify(error);
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('ai-companion')) {
        throw new Error('ai-companion edge function is not deployed. Please contact support.');
      }
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('No response from AI service');
    }

    const assistantContent = data?.content || data?.message || 'I encountered an issue. Let\'s try again — what\'s on your mind?';

    // Save assistant response to DB
    const { error: saveResponseError } = await aiSessions.addMessage(sessionId, 'assistant', assistantContent);
    if (saveResponseError) {
      console.error('[AI Companion] Failed to save assistant response:', saveResponseError);
      // Still return the content even if save failed — the user should see the response
      return { content: assistantContent };
    }

    return { content: assistantContent };
  } catch (err: any) {
    const errorMsg = err.message || 'Failed to get AI response';
    console.error('[AI Companion] Error:', errorMsg);
    return {
      content: '',
      error: errorMsg,
    };
  }
}

// ─── Suggested prompts based on daily state ──────────────────────────────────

export function getSuggestedPrompts(entry: DailyEntry | null): string[] {
  const prompts: string[] = [];

  if (!entry?.ten_x_action_completed) {
    prompts.push("I didn't complete my top priority today");
  }
  if ((entry?.determination_level || 5) < 6) {
    prompts.push("I'm feeling low energy and need a boost");
  }
  if (entry?.compound_count === 0) {
    prompts.push("I haven't done my compound habit yet");
  }

  // Always available
  prompts.push("I got distracted and lost focus");
  prompts.push("I'm feeling stressed and overwhelmed");
  prompts.push("I want to plan my biggest move for tomorrow");

  return prompts.slice(0, 4); // Max 4 suggestions
}

// ─── Generate Today's Action Report ──────────────────────────────────────────

export async function generateActionReport(
  context: AIContext,
  signals: Array<{ title: string; status: string }>,
): Promise<string> {
  try {
    const signalSummary = signals.map(s =>
      `- ${s.title} (${s.status})`
    ).join('\n');

    const { data, error } = await supabase.functions.invoke('ai-companion', {
      body: {
        system: `You are the 10xUnicorn AI Companion. Generate a brief, punchy daily action report for ${context.userName || 'Unicorn'}. Keep it to 3-4 sentences. Focus on what's planned, what's done, and the #1 priority right now. Be direct and motivating. No markdown formatting.`,
        messages: [{
          role: 'user',
          content: `My 10x goal: ${context.goalTitle || 'Not set'}
Determination: ${context.determinationLevel}/10
10x Action: ${context.tenXAction || 'Not set'} (${context.tenXActionCompleted ? 'DONE' : 'not done'})
Compound habit: ${context.compoundCount} reps
Signals:\n${signalSummary || 'None set'}

Give me my action report.`,
        }],
      },
    });

    if (error) throw error;
    return data?.content || data?.message || 'Set your 10x action and signals to get your daily report.';
  } catch (err) {
    return 'Set your 10x action and signals to unlock your daily action report.';
  }
}

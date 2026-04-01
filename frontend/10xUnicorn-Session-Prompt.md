# 10xUnicorn App — Full Project Context Prompt

Copy everything below this line into a new Claude Code / Cowork session:

---

## PROJECT: 10xUnicorn App Migration & Build

I'm migrating my 10xUnicorn app off Emergent Labs ($200/mo, renews ~April 3, 2026) to a self-managed stack. The React Native/Expo frontend has been rebuilt and is partially working. I need you to continue debugging, fixing, and building out the app.

**CRITICAL: Mount my project folder first:**
```
~/Desktop/10xUnicorn/frontend
```
Write ALL files directly to this folder. Do NOT create intermediate/output folders and ask me to copy files. Work directly in my project.

---

## SUPABASE PROJECT

- **Project Name:** 10xUnicorn
- **Project ID:** `yzhpnaxnljvozatawclj`
- **Region:** us-east-1
- **URL:** `https://yzhpnaxnljvozatawclj.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6aHBuYXhubGp2b3phdGF3Y2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDc0OTIsImV4cCI6MjA5MDMyMzQ5Mn0.NHf_ABZ7nPM8s743SgUVqzl_yb6RQiie3xKMzG2iUZw`
- **Auth trigger:** `on_auth_user_created` → `handle_new_user` (auto-creates profile row)

### Test Accounts
| Email | User ID | Password |
|-------|---------|----------|
| dknightunicorn@gmail.com | 98cd7bc4-c23d-447b-a677-17604c38bfb8 | 10xUnicorn2026! |
| daniel@unicornuniverse.io | 8ca2402b-eb38-43fd-9949-dc9c0168fa04 | 10xUnicorn2026! |

### Auth Fix Applied
GoTrue (Go) crashes on NULL string columns in auth.users. Both accounts had NULL columns fixed:
```sql
UPDATE auth.users SET email_change = '', phone_change = '', email_change_token_new = '',
email_change_token_current = '', confirmation_token = '', recovery_token = '',
reauthentication_token = '' WHERE id IN ('98cd7bc4-c23d-447b-a677-17604c38bfb8', '8ca2402b-eb38-43fd-9949-dc9c0168fa04');
```
If new users get "Database error querying schema" on login, run the same fix on their auth.users row.

---

## TECH STACK

- **Frontend:** React Native + Expo SDK 54, TypeScript, Expo Router v4 (file-based routing)
- **Navigation:** React Navigation v7 (@react-navigation/bottom-tabs ^7.0.0, @react-navigation/native-stack ^7.0.0)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- **AI:** Anthropic API (Claude Sonnet) — replacing OpenAI
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth (Email/password + Google OAuth + password reset)

### Key Version Constraints
- Expo SDK 54, React Native 0.81.5, React 19.1.0
- expo-router ~6.0.23 (Expo Router v4)
- React Navigation v7: NO `Stack.Group`, NO `animationEnabled`/`animationTypeForReplace` — use `animation: 'fade'` instead
- react-native-url-polyfill: use `/auto` NOT `/dist/polyfill`
- react-native-reanimated ~4.1.1: Requires `react-native-worklets` as separate package
- Always `npm install --legacy-peer-deps` (peer dep conflicts otherwise)

---

## DATABASE SCHEMA (Supabase — all tables have RLS enabled)

### profiles (2 rows) — Primary test account: Daniel Knight, display_name "Daniel", emoji 🦄, daily_compound_target 5, onboarding_completed true
id (uuid PK → auth.users), email, full_name, display_name, emoji, avatar_url, phone, linkedin_url, twitter_url, instagram_url, youtube_url, bio, onboarding_completed (bool, default false), daily_compound_target (int, default 0), created_at, updated_at

### contacts (23 rows, 10 wormhole) — UNIFIED (wormhole is a boolean flag, not separate table)
id, user_id, full_name, email, phone, company, title, type (prospect|client|referral_partner|strategic_partner|resource), is_wormhole (bool), connection_level (1-10), engagement_tags (text[]), platform_preferences (text[]), reciprocity_notes, last_interaction_date, linkedin_url, twitter_url, instagram_url, avatar_url, details, extra_fields (jsonb), created_at, updated_at

### contact_notes (3 rows)
id, contact_id → contacts, user_id → profiles, content, created_at, updated_at

### interactions (8 rows) — calls, video_calls, introductions, emails, texts, referrals linked to contacts
id, contact_id → contacts, user_id → profiles, types (text[]), notes, created_at

### signals (14 rows) — Mix of revenue_generating, marketing, relational, 10x_action, general_business across all statuses
id, user_id, title, details, type (revenue_generating|marketing|general_business|relational|10x_action), status (not_started|in_progress|complete), due_date, score, duration_minutes, contact_id → contacts, deal_id → deals, completed_at, created_at, updated_at

### signal_notes (0 rows)
id, signal_id → signals, user_id → profiles, content, created_at, updated_at

### deals (6 rows) — Night Build, Night Launch, Night Build Pro, Workshop, UU Premium across lead/proposal/negotiation/closed_won
id, user_id, title, value (numeric), stage (lead|proposal|negotiation|closed_won|closed_lost), contact_id → contacts, expected_close_date, reminder_date, details, created_at, updated_at

### deal_notes (0 rows)
id, deal_id → deals, user_id → profiles, content, created_at, updated_at

### daily_entries (59 rows — 7 recent + 52 weeks of history) — Today (March 29) has rich entry: determination 8, stacking_wins status, 10x action set, wormhole contact selected, future self journal filled
id, user_id, entry_date (UNIQUE with user_id), status (not_prepared|ready|stacking_wins|priority_win|ten_x_unicorn_win|course_corrected_win|lesson_win|miss), determination_level (1-10), intention, ten_x_action, ten_x_action_completed (bool), compound_count (int), wormhole_contact_id → contacts, focus_reflection, focus_stayed_on_track (bool), checklist (jsonb), future_self_date, future_self_journal, future_self_completed (bool), created_at, updated_at

### daily_signals (0 rows) — junction table
id, daily_entry_id → daily_entries, signal_id → signals, created_at

### goals (2 rows) — Active: "Generate $1M in revenue through Knight Ops & Unicorn Universe", target_date 2026-12-31, target_number 1000000, progress 12%
id, user_id, title, description, target_date, target_number (numeric, nullable), progress (0-100), status (active|completed|archived), created_at, updated_at

### ai_sessions (3 rows)
id, user_id, session_type (course_correction|action_report), created_at

### ai_messages (6 rows)
id, session_id → ai_sessions, role (user|assistant), content, created_at

### streaks (6 rows) — compound: 12 current/18 longest, determination: 5/9, win: 3/7
id, user_id, streak_type (compound|win|determination), current_count, longest_count, last_date, updated_at

### points (6 rows) — streak_milestone 50pts, signal_complete 25pts x2, planned_ahead 10pts, before_6pm 10pts
id, user_id, amount, reason, reference_id, created_at

---

## FILE STRUCTURE

```
~/Desktop/10xUnicorn/frontend/
├── app/
│   ├── _layout.tsx              # Root layout — AuthProvider wrapper, flat Stack.Screen entries
│   ├── index.tsx                # Splash/router — redirects based on auth state
│   ├── onboarding.tsx           # Multi-step onboarding flow
│   ├── ai-chat.tsx              # AI Companion modal screen
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth stack — uses animation: 'fade'
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigator — 5 visible + 4 hidden tabs
│       ├── today.tsx            # Daily flow screen (~990 lines)
│       ├── dashboard.tsx        # Analytics dashboard
│       ├── community.tsx        # Community hub
│       ├── crm.tsx              # Contact relationship manager
│       ├── profile.tsx          # User profile & settings
│       ├── signals.tsx          # Hidden tab — signals management
│       ├── deals.tsx            # Hidden tab — deals pipeline
│       ├── wormhole.tsx         # Hidden tab — wormhole contacts
│       └── messages.tsx         # Hidden tab — messaging
├── src/
│   ├── constants/
│   │   └── theme.ts             # Colors, Typography (with .sizes map), Spacing, DETERMINATION_EMOJIS, CONTACT_TYPE_LABELS
│   ├── context/
│   │   └── AuthContext.tsx       # Auth provider — exports: login, register, loginWithGoogle, logout, requestPasswordReset, setUserOnboarded, refreshUser, updateProfile
│   ├── types/
│   │   └── database.ts          # TypeScript types matching Supabase schema
│   └── utils/
│       ├── supabase.ts          # Supabase client init (import 'react-native-url-polyfill/auto')
│       ├── database.ts          # All CRUD operations — namespaced: dailyEntries, contacts, signals, deals, goals, streaks, points, aiSessions
│       └── ai-companion.ts      # AI companion logic
├── package.json
├── app.json
├── tsconfig.json
└── assets/
```

---

## CRITICAL PATTERNS & GOTCHAS

### Tab Layout (app/(tabs)/_layout.tsx)
- 5 visible tabs: today, dashboard, community, crm, profile
- 4 hidden tabs: signals, deals, wormhole, messages
- Hidden tabs use `tabBarButton: () => null` ONLY — do NOT also set `href: null` (Expo Router throws "Cannot use href and tabBarButton together")

### Database Field Names (daily_entries)
The frontend code MUST use these exact column names:
- `determination_level` (NOT `determination`)
- `ten_x_action` (NOT `ten_x_focus`)
- `ten_x_action_completed` (NOT `ten_x_complete`)
- `future_self_journal` (NOT `future_reflection`)
- `future_self_completed` (NOT `future_reflection_complete`)
- `compound_count` (NOT `daily_compound`)
- `checklist` (NOT `daily_checklist`)
- `status` field values: `not_prepared`, `ready`, `stacking_wins` (NOT `day_status`)

### Contact Type Values
Valid: `prospect`, `client`, `referral_partner`, `strategic_partner`, `resource`
NOT valid: `lead`, `customer`, `partner`, `influencer`, `other`

### Safe Area
All tab screens must use `useSafeAreaInsets()` from `react-native-safe-area-context` with `paddingTop: insets.top` on the outermost container. Without this, content overlaps the iOS status bar.

### Supabase Response Pattern
Supabase returns `{ data, error }`. Always default arrays: `setContacts(data || [])` — never assign the raw response to state or you get "X.filter is not a function".

### AuthContext
- Uses `.maybeSingle()` (NOT `.single()`) on profile fetch — prevents crash when profile doesn't exist yet
- Exports `logout` (NOT `signOut`) — the function internally calls `supabase.auth.signOut()`

### Determination Emojis
```
1: ☠️ (skull)    6: 🚲 (bicycle)
2: 😴 (sleeping)  7: 🏎️ (race car)
3: 😢 (crying)    8: 🔥 (fire)
4: 🐢 (turtle)    9: 💎 (diamond)
5: 🏃 (runner)   10: 🦄 (unicorn)
```

### PostgREST Schema Cache
After table changes, refresh with: `NOTIFY pgrst, 'reload schema'`

---

## CURRENT STATUS & WHAT NEEDS WORK

### Working
- App bundles and loads in Expo Go (after clean `npm install --legacy-peer-deps`)
- Login/auth flow works (both test accounts)
- Tab navigation with 5 visible tabs, 4 hidden (using `tabBarButton: () => null` only — NO `href: null`)
- Safe area padding on all screens
- Database CRUD operations (database.ts has all namespaced methods)
- Daily entry data saving (determination, 10x action, compound count, etc.)
- Day status transitions — DB check constraint now supports 8 values: `not_prepared`, `ready`, `stacking_wins`, `priority_win`, `ten_x_unicorn_win`, `course_corrected_win`, `lesson_win`, `miss`
- Wormhole contact display (connection_level is INTEGER 1-10, displayed as labels)
- Deal creation from CRM screen

### Recently Fixed (March 29, 2026)
- **today.tsx**: Removed references to non-existent columns (`tomorrow_prepared`, `course_corrected`, `distraction_notes`). These are now stored in the `checklist` jsonb field instead.
- **today.tsx**: Removed invalid status values at the time. DB constraint has since been updated to support 8 statuses: `not_prepared`, `ready`, `stacking_wins`, `priority_win`, `ten_x_unicorn_win`, `course_corrected_win`, `lesson_win`, `miss`. The frontend `DayStatus` type in `database.ts` and `DAY_STATUS_OPTIONS` in `today.tsx` need updating to include all 8.
- **today.tsx**: Fixed JSX syntax error (mismatched KeyboardAvoidingView closing tag)
- **today.tsx**: Fixed `buildAIContext()` calls — was passing (userId, date) but function takes (profile, goal, entry) objects
- **today.tsx**: Fixed `generateActionReport()` calls — was missing required signals parameter
- **wormhole.tsx**: Fixed `connection_level.split()` crash — connection_level is an integer, not a string. Added helper functions for labels/colors.
- **crm.tsx**: Fixed deal creation — explicitly construct dealData with only valid DB fields
- **ai-chat.tsx**: Added initialization state, error handling, "Try Again" button. Now shows clear error when edge function unavailable.
- **ai-companion.ts**: Added edge function availability detection and better error messages

### Fixed (March 29, 2026 — Second Pass)
- **crm.tsx**: Contact notes now correctly call `contactNotes.create(userId, contactId, content)` — was missing userId param
- **crm.tsx**: Interaction log now correctly calls `interactions.create(userId, contactId, {type, description, impact_rating})` — was sending `types` array but DB has single `type` column. Now creates one interaction per selected type.
- **crm.tsx**: Interaction display fixed — was iterating `interaction.types` (array) but DB returns `interaction.type` (string)
- **crm.tsx**: Contact type filter fixed — was using `Object.values(CONTACT_TYPE_LABELS)` (display labels like "Prospect") to compare against `contact.type` (DB keys like "prospect"). Now uses `Object.entries` with keys.
- **crm.tsx**: Contact filter chips now horizontally scrollable with colored left border per type
- **crm.tsx**: Signal type options corrected — was showing `cost_saving`, `expansion`, `risk` (wrong). Now shows all 5 correct types: `revenue_generating`, `10x_action`, `marketing`, `general_business`, `relational`
- **crm.tsx**: Signal score now uses tappable 1-10 buttons instead of text input
- **crm.tsx**: Added edit modals for contacts, signals, and deals (edit button + long-press on signals)
- **crm.tsx**: Deal cards now tappable to edit, with edit + delete icons
- **crm.tsx**: Deal stage filter chips made more compact to prevent cutoff
- **theme.ts**: STATUS_LABELS and STATUS_COLORS updated with all 8 day statuses
- **database.ts (types)**: DayStatus type updated to include all 8 values
- **today.tsx**: DAY_STATUS_OPTIONS updated with all 8 statuses with emoji prefixes
- **today.tsx**: computedDayStatus now auto-sets `ten_x_unicorn_win` when all 5 checklist items complete, `priority_win` when just 10x action done

### Fixed (March 29, 2026 — Third Pass)
- **crm.tsx**: Full design upgrade — glowing card shadows, accent borders, avatar initials on contacts, connection level bar, type-colored signal accents, gradient metric cards, sleeker deal cards, rounded FAB, polished modals
- **crm.tsx**: Signal date picker replaced with proper mini-calendar grid with month navigation, day headers, selected/today highlighting, plus preset buttons (Today/Tomorrow/Next Week). No more keyboard covering the picker.
- **crm.tsx**: Fixed `Colors.text` → `Colors.text.primary` in 4 modal close icon locations
- **today.tsx**: Added swipeable signal rows (swipe left=delete, right=edit, long-press=reschedule) using react-native-gesture-handler Swipeable
- **today.tsx**: Added "Add Signal to Today" modal — shows all active/not_started signals with edit + add buttons
- **today.tsx**: Added Edit Signal modal from Today screen with type/score/date/details fields
- **today.tsx**: Added Reschedule Signal modal (long-press) with Today/Tomorrow/Next Week presets
- **index.tsx (splash)**: Integrated actual 10xUnicorn logo from CDN, replaced emoji placeholder. 5-phase animation: logo spring-in → shield glow → tech scan/glitch transformation → text reveal → fade to app
- **Supabase data**: Added 10 new signals, 6 new deals, 5 new contacts. Totals: 28 contacts, 36 signals, 16 deals
- **today.tsx**: "Set" button text changed to "Complete" on 10x action
- **today.tsx**: "Who are you being today?" section now has more padding and larger font
- **today.tsx**: Dual progress bars added to Daily Compound section (daily target bar in cyan/purple + 10x goal bar in red→green gradient)
- **dashboard.tsx**: 10x Goal now shows `target_number` as large formatted dollar amount
- **dashboard.tsx**: Edit goal modal includes `target_number` field
- **dashboard.tsx**: Progress display fixed (was multiplying by 100 but progress is already 0-100)
- **index.tsx**: Animated splash screen with unicorn knight shield logo, glow pulse, fade-in sequence, smooth transition
- **Supabase**: `target_number` column added to `goals` table (numeric, nullable)
- **Supabase**: 11 new contacts added across all 5 types (23 total, good spread)
- **DEAL_STAGE_LABELS**: "Negotiation" shortened to "Negotiating", "Closed Won" to "Won ✓"

### Needs Testing / Likely Has Issues
- Avatar upload on profile (reported crash on save)
- Profile edit modal (reported crash)
- Community screen (may be placeholder)
- Messages screen
- Signal swipe gestures (not yet implemented — needs react-native-gesture-handler)
- Signal editing from Today screen (not yet implemented)
- Animated logo needs actual logo image upload from user (currently uses 🦄 emoji)

### AI Companion — Edge Function Required
The AI chat UI works but the Supabase Edge Function `ai-companion` needs to be deployed. Without it, users see "AI Companion is currently unavailable." The edge function should proxy requests to Anthropic's API (Claude Sonnet). Scaffold exists at `supabase/functions/ai-companion/index.ts` but needs to be deployed to project `yzhpnaxnljvozatawclj`.

### Feature Requests — Priority (Build Next)

**1. ~~Clean Up Signal Creation Page~~ ✅ DONE** — Types corrected, score uses 1-10 buttons

**2. ~~Edit Signals from CRM Hub~~ ✅ DONE** — Edit modal added, long-press to edit, edit icon on cards

**3. ~~Edit Deals + Fix Tab Cutoff~~ ✅ DONE** — Edit modal added, tap deal to edit, chips made compact

**4. Profile Edit Crash + Avatar Fix** ⚠️ NOT YET FIXED
- Edit profile currently crashes when saving — needs debugging
- Avatar upload is not saving to Supabase Storage / not displaying after upload
- Cleaner profile layout overall — better spacing, readability

**5. Profile Syncs with Community/Directory**
- Profile fields should sync to the community member directory
- Add field visibility controls — user picks which fields are public vs private
- Community directory should pull from profiles table

**6. ~~Update DayStatus to Support All 8 Statuses~~ ✅ DONE** — All types, labels, colors, and options updated

**7. ~~UI Polish — Today Screen~~ ✅ DONE** — Padding, font size, "Complete" button text

**8. ~~Signal Swipe Gestures + Edit from Today Screen~~ ✅ DONE**
- Swipeable rows: swipe left=delete, swipe right=edit, long-press=change date
- Uses `react-native-gesture-handler` Swipeable component
- "Add" button opens modal showing all active/not_started signals with edit + add-to-today buttons
- Edit signal modal on Today screen with type/score/date/details fields
- Reschedule modal with Today/Tomorrow/Next Week presets

**9. Countdown Clock for 10x Action**
- Add a countdown clock next to the "Complete" button that counts down until 12:00 PM
- If they complete the 10x action before noon, award 50% bonus points
- Visual urgency motivator — clock should be prominent

**10. 7-Day Streak Display + 52-Week Activity Grid**
- Show current 7-day streak visualization on the stats/dashboard screen
- Show a 52-week activity grid (GitHub-style contribution heatmap) using the historical daily_entries data
- 52 weeks of test data already loaded in DB with gradual progression

**11. Wormhole Network Stats on Dashboard**
The stats/dashboard page should show a "Wormhole Network" section with:
- **Top Wormhole Relationship**: Highest connection_level contact — show name, level, last interaction
- **Lowest Wormhole Relationship**: Lowest connection_level wormhole contact — show name, level, suggested outreach
- **Biggest Potential Relationship**: Non-wormhole contact with highest engagement potential — show name, why they're high potential
- Each card should show points earned from that relationship
- Include outreach template suggestions (quick text/email templates to reach out)

**12. 10x Unicorn Checklist → Trophy Animation**
When all 5 checklist items are complete on today.tsx, the status should auto-set to `ten_x_unicorn_win`. The entire checklist should disappear and be replaced by a big, animated, glowing 10x Unicorn trophy. Award bonus points based on how early in the day they complete it.

**13. ~~10x Goal with Number Field + Date Picker~~ ✅ PARTIALLY DONE** — `target_number` column added, displays in dashboard + edit modal. Goal setup instructions for onboarding still needed.
The goal should have a static numerical target field and a date picker. Include these instructions on the goal setup screen:
- "Set a wildly important goal that is 3-5 years out."
- "Then multiply it by 10."
- "Make sure it's tangible, numerical, and feels like you would need to make some changes for that to happen."
- "Take the deadline and reduce it to 1 year or less. Then reduce it again to 90 days or 30 days. Play with the timeline — go farther out and come closer. You could do a week. You could do a day. What would that look like?"
The AI companion's system prompt should also reference these instructions when coaching.

**14. ~~Daily Compound Progress Bar~~ ✅ DONE** — Dual bars on today.tsx: cyan/purple for daily target, red→green gradient for 10x goal progress.

**15. AI Companion Admin Panel (in Profile)**
A section in the admin profile for the "10x UNICORN AI" database where the user can:
- Upload files the AI can reference
- Store links/websites the AI can reference
- Paste text the AI can reference
- Create custom instructions for the AI
- Create preset prompt templates
This feeds into the AI companion's context when generating responses.

**16. Deploy `ai-companion` Edge Function**
The AI chat UI works but the Supabase Edge Function `ai-companion` needs to be deployed to project `yzhpnaxnljvozatawclj`. It should proxy requests to Anthropic's API (Claude Sonnet). Without it, users see "AI Companion is currently unavailable."

**17. Bulk Contact Import from Phone**
- Show all phone contacts with search
- Multi-select contacts to import at once
- Choose the contact type during import (default: prospect, dropdown per contact)
- "Select All" / "Change All" button for bulk type assignment

**18. Community Admin Panel**
Admin panel for the member directory — ability to customize which fields are displayed publicly vs privately per member.

**19. Animated Loading Screen — Logo Replacement**
The animated splash screen is built (`app/index.tsx`) with shield gradient, glow pulse, fade transitions, and loading dots. Currently uses 🦄 emoji as placeholder. User wants to upload their actual logo which should replace the emoji. The animation concept: unicorn knight of technology that morphs into a robot. Full page transitions as it loads and fades into the dashboard.

### Feature Requests — Later
- **Interaction tracking with weight-based connection scoring**
- **Calendar integration for signals** (duration dropdown → create calendar event)
- **Today's Action Report** (AI-generated daily summary under inspirational quote)
- **Branded Supabase email templates**
- **Phase 0: Data extraction from Emergent Labs MongoDB** (before April 3)
- **Apple App Store resubmission**
- **Google Play Store submission**
- **Web application (Next.js on Vercel — future phase)**

---

## TEST DATA LOADED (dknightunicorn@gmail.com account)

The database has rich test data for the primary account. Use this to verify all screens render correctly:

| Table | Count | Highlights |
|-------|-------|-----------|
| Profiles | 2 | Daniel Knight (🦄, daily_compound_target: 5) + daniel@unicornuniverse.io account |
| Contacts | 23 | 10 wormhole, good spread: 6 prospect, 5 client, 4 referral_partner, 5 strategic_partner, 3 resource |
| Signals | 26+ | All 5 types, all 3 statuses, linked to contacts and deals |
| Deals | 10 | Night Build $7.5K, Night Launch $1.5K, Night Build Pro $15K, Workshop $1K, plus more across all stages |
| Daily Entries | 59+ | 7 recent rich entries (March 23-29) + 52 weeks of history with gradual progression |
| Interactions | 8 | Calls, video_calls, intros, referrals, emails linked to contacts |
| Contact Notes | 3 | Pipeline notes on Marcus, Jasmine, Jordan |
| Streaks | 6 | Both accounts — Compound: 12 current/18 longest, Determination: 5/9, Win: 3/7 |
| Points | 6+ | Both accounts — streak_milestone, signal_complete, planned_ahead, before_6pm |
| Goals | 2 | Both accounts — "$1M revenue" active, target 2026-12-31, 12% progress |

Key wormhole contacts: Marcus Rivera (9), Jasmine Chen (8), Devon Williams (7), Sophia Torres (6), Brian Abramson, Daven Michaels, Travis Brady

Key deals to test: MitchFit ($7,497 negotiation), Brooks Consulting ($1,497 proposal), Scale Ventures ($14,997 lead)

---

## HOW TO RUN

```bash
cd ~/Desktop/10xUnicorn/frontend
# If node_modules are corrupted:
rm -rf node_modules && npm install --legacy-peer-deps
# Start with cache clear:
npx expo start -c
# Scan QR code with Expo Go on phone
```

---

## PROJECT PLAN DOCUMENT

The full project plan is at: `~/Desktop/10xUnicorn/frontend/10xUnicorn_Project_Plan.docx`
It covers Phase 0 (data extraction) through Phase 6 (web app) with detailed schema, feature specs, and timeline.

---

## RULES FOR THIS PROJECT

1. **Write directly to my project folder** — never create intermediate output folders
2. **Always use `--legacy-peer-deps`** when installing npm packages
3. **Check with me before overwriting** if you're unsure which project a file belongs to
4. **Use the Supabase MCP** for any database operations (project ID: `yzhpnaxnljvozatawclj`)
5. **Test in Expo Go** — we're not doing native builds yet
6. **Keep the existing file structure** — don't reorganize without asking
7. **No Stack.Group, no href+tabBarButton together, no deprecated v6 nav options**

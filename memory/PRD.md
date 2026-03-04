# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is an integrated goal execution dashboard, relationship intelligence system, and community performance platform for business owners. It combines daily habit tracking, CRM functionality, community features, and direct messaging.

## Tech Stack
- **Frontend:** Expo (React Native), TypeScript, Expo Router
- **Backend:** FastAPI, Python, MongoDB
- **Authentication:** JWT-based
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Push Notifications:** Expo Push Service (free, no signup)
- **Cloud Storage:** Emergent Object Storage

## Implemented Features (As of March 2026)

### Phase 1 - Core Foundation
- [x] User Authentication (register, login, JWT)
- [x] Onboarding flow (name, timezone, 10x goal)
- [x] Dark futuristic UI theme (navy, purple, cyan)
- [x] Today screen with date navigation

### Phase 2 - Today Screen & Daily Tracking
- [x] **Collapsible Determination Slider (NEW)**
  - Fluid gradient slider (orange→red→purple)
  - Fire emoji thumb, levels: 8=🔥, 9=💎, 10=🦄
  - Collapsed view shows emoji + value + "Check In" button
  - Auto-collapses after setting determination
  - Expands on tap for adjustments
  - Inspiration messages when determination < 8
- [x] **"Who are you being today? I am ____"** intention format (NEW)
- [x] 10x Focus section with **glowing complete button** (NEW)
  - Massive circular button with glow effect
  - Turns to animated 🔥 fire when completed
  - Edit button to navigate to signal details
- [x] 10x Unicorn Checklist with descriptions:
  1. Top 10x Action Complete - "Set your 10x focus above"
  2. Wormhole Relationship Activated - "Set contact below"
  3. 7-Min Future Self Meditation - "Connect with your highest self"
  4. Tomorrow Prepared - "Plan tomorrow's priorities now"
  5. No Distraction / Course Corrected - "Locked in or recovered fast"
- [x] All 5 = 🦄 10x Unicorn Win, Just #1 = ⭐ Priority Win
- [x] Compound Habit tracking with streaks and count
- [x] Today's Signals list with Add Signal modal
- [x] Signal impact rating (1-10) and deal association
- [x] AI Course Correction (OpenAI integration)

### Phase 3 - Signals System (ENHANCED)
- [x] Create signals with impact rating (1-10)
- [x] Signal due date with MM/DD/YY format
- [x] Calendar default: today (before 3 PM) or tomorrow (after 3 PM)
- [x] Link signals to deals
- [x] Top 10x Action as special signal (10 points)
- [x] Signal completion with points
- [x] **Signal uncomplete endpoint (NEW)** - POST /api/signals/{id}/uncomplete
- [x] Signals now editable (points, notes, rich text future)
- [x] Planned ahead bonus, Before 6 PM bonus

### Phase 4 - Dashboard Screen
- [x] My 10x Goal Card with Edit Goal button
- [x] Stats Grid: Current Streak 🔥, Best Streak ⭐, Unicorn Days 🦄, Priority Wins ⭐
- [x] Last 7 Days: Circular progress indicators
- [x] Determination Trend: Bar chart with gradient bars
- [x] Activity Heatmap: GitHub-style contribution graph (365 days)
- [x] Wormhole Network Summary

### Phase 5 - CRM System (RESTRUCTURED)
- [x] **Tab order: Signals, Contacts, Deals (NEW)**
- [x] Single CRM tab with 3 sub-tabs
- [x] Contact Labels: prospect, referral_partner, strategic_partner, client, wormhole, resource
- [x] Connection Levels:
  - Active / Professional (purple)
  - Warm / Local (green)
  - Building (amber)
  - Mid-Aspirational (orange)
  - Close / Personal (pink)
- [x] Contact Tags: influencer, speaker, business_owner, access, mindset, future_self, community_partner, motivation
- [x] Workflow Fields: activation_next_step, last_contact_date, set_meeting, preferred_platform, power_leverage, best_contact_method
- [x] Engagement Tracking
- [x] Deal stages and close_date with notifications
- [x] Signals list view with edit capability

### Phase 6 - Wormhole System (Enhanced Contacts)
- [x] Wormhole Detail Page with full editable profile
- [x] Logs Timeline with action types
- [x] Quick "Log an Action" form
- [x] Auto-layout based on contact type

### Phase 7 - Goal Progress Tracking
- [x] Goal deadline and target_number
- [x] Daily progress check-in
- [x] Status ring colors for community avatars
- [x] Points for daily progress updates

### Phase 8 - Community Features
- [x] Community feed with signal completions and help requests
- [x] Leaderboard by points
- [x] Member directory with search
- [x] Member profiles with **first_name + emoji display (NEW)**
- [x] Status ring around avatars
- [x] Help request system

### Phase 9 - Direct & Group Messaging
- [x] Direct messages between community members
- [x] Conversations list with unread count
- [x] Group chat creation and messaging

### Phase 10 - Push Notifications
- [x] Expo Push Service Integration (free)
- [x] Push token registration
- [x] Message, deal, and daily check-in notifications
- [x] Notification settings in profile

### Phase 11 - Profile & Storage (ENHANCED)
- [x] **Profile emoji picker (NEW)** - 16 emojis to choose from
- [x] **First name field (NEW)** - Display as "FirstName + Emoji"
- [x] Cloud Storage for Profile Photos via Emergent Object Storage
- [x] **Edit profile includes 10x Goal and Compound Habit (NEW)**
- [x] Show/hide goal status ring toggle

## Navigation Structure (UPDATED)
- **Daily** (⚡) - Daily tracking, determination slider, signals
- **Dashboard** (📊) - Bar chart icon, stats, streaks, heatmap
- **Community** (🏆) - Leaderboard, Feed, Directory
- **CRM** (🌀) - Signals → Contacts → Deals tabs
- **Profile** (👤) - Profile settings, emoji, goal, habit

## API Endpoints

### Authentication
- POST /api/register, POST /api/login, GET /api/auth/me

### Dashboard
- GET /api/dashboard/stats

### Signals
- GET/POST /api/signals
- PUT/DELETE /api/signals/{id}
- POST /api/signals/{id}/complete
- **POST /api/signals/{id}/uncomplete (NEW)**

### CRM - Contacts
- GET/POST /api/wormhole-contacts
- PUT/DELETE /api/wormhole-contacts/{id}
- GET /api/wormhole-contacts/options
- POST/GET /api/wormhole-contacts/{id}/logs

### CRM - Deals
- GET/POST /api/deals
- PUT/DELETE /api/deals/{id}
- GET /api/deals/notifications

### Goals
- GET/POST /api/goals
- PUT /api/goal
- POST /api/goals/progress

### Community
- GET /api/community/feed
- POST /api/community/help-request
- GET /api/community/members

### Messaging
- POST/GET /api/messages/direct
- POST/GET /api/messages/groups

### Notifications
- POST /api/notifications/push-token
- GET/PUT /api/notifications/settings

### Profile & Storage
- GET/PUT /api/profile (now includes first_name, profile_emoji)
- PUT /api/compound-habit
- POST/PUT /api/profiles/photo
- GET /api/files/{path}

## Database Collections
- users, goals, signals, signal_completions
- deals, wormhole_contacts, wormhole_logs
- daily_entries, profiles, member_profiles
- user_points, compound_habits, help_requests
- messages, group_chats
- push_tokens, notification_settings, notifications
- files

## Testing Status (March 4, 2026)
- Backend: 95% (106/111 tests)
- All new features verified working
- Test files: /app/backend/tests/
- Latest report: /app/test_reports/iteration_6.json

## Pending Implementation (In Progress)

### P0 - Immediate
- [ ] Rich text formatting in signal notes (bold, italic, underline, headers, links)
- [ ] Compound habit counter modal (ask "how many times" when complete)
- [ ] Go back a day to update compound count
- [ ] Keyboard avoiding view fix for modal forms

### P1 - Medium Priority
- [ ] Activity level rings based on streak colors
- [ ] Real-time messaging with WebSocket
- [ ] Background push notification scheduling

### P2 - Future
- [ ] Premium tiers and coaching integrations
- [ ] Refactor server.py into APIRouter modules
- [ ] Refactor crm.tsx into smaller components

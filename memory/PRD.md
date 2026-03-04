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
- [x] Determination Level slider (0-10) with emoji feedback
  - **NEW:** Fluid gradient slider (orange→red→purple)
  - **NEW:** Fire emoji thumb, levels: 8=🔥, 9=💎, 10=🦄
- [x] 10x Focus section with Top 10x Action (special signal worth 10 points)
- [x] 10x Unicorn Checklist with descriptions:
  1. Top 10x Action Complete - "Set your 10x focus above"
  2. Wormhole Relationship Activated - "Set contact below"
  3. 7-Min Future Self Meditation - "Connect with your highest self"
  4. Tomorrow Prepared - "Plan tomorrow's priorities now"
  5. No Distraction / Course Corrected - "Locked in or recovered fast"
- [x] All 5 = 🦄 10x Unicorn Win, Just #1 = ⭐ Priority Win
- [x] Compound Habit tracking with streaks
- [x] Today's Signals list with Add Signal modal
- [x] Signal impact rating (1-10) and deal association
- [x] AI Course Correction (OpenAI integration)

### Phase 3 - Signals System
- [x] Create signals with impact rating (1-10)
- [x] Signal due date with MM/DD/YY format
- [x] Calendar default: today (before 3 PM) or tomorrow (after 3 PM)
- [x] Link signals to deals
- [x] Top 10x Action as special signal (10 points)
- [x] Signal completion with points
- [x] Planned ahead bonus, Before 6 PM bonus

### Phase 4 - Dashboard Screen (NEW)
- [x] **My 10x Goal Card** with Edit Goal button
- [x] **Stats Grid:** Current Streak 🔥, Best Streak ⭐, Unicorn Days 🦄, Priority Wins ⭐
- [x] **Last 7 Days:** Circular progress indicators showing daily completion
- [x] **Determination Trend:** Bar chart with gradient bars
- [x] **Activity Heatmap:** GitHub-style contribution graph (365 days)
- [x] **Wormhole Network Summary:** Top contacts by engagement

### Phase 5 - CRM System (Consolidated)
- [x] Single CRM tab with Deals + Contacts sub-tabs
- [x] **Contact Labels:** prospect, referral_partner, strategic_partner, client, wormhole, resource
- [x] **Connection Levels (UPDATED):**
  - Active / Professional (purple)
  - Warm / Local (green)
  - Building (amber)
  - Mid-Aspirational (orange)
  - Close / Personal (pink)
- [x] **Contact Tags (UPDATED):** influencer, speaker, business_owner, access, mindset, future_self, community_partner, motivation
- [x] **Workflow Fields:** activation_next_step, last_contact_date, set_meeting, preferred_platform, power_leverage, best_contact_method
- [x] **Engagement Tracking:** engagement_level, engagement_types, tagging_in_posts, tagging_in_comments
- [x] **Reciprocity Notes:** value exchange documentation
- [x] Deal stages: lead, qualified, proposal, negotiation, closed_won, closed_lost
- [x] Deal close_date with smart notifications
- [x] Deal priority calculation based on value/stage/timing

### Phase 6 - Wormhole System (Enhanced Contacts)
- [x] Wormhole Detail Page with full editable profile
- [x] **Logs Timeline:** wormhole_logs collection per contact
- [x] **Log Action Types:** call, meeting, dm, email, coffee_chat, collaboration, intro_made, follow_up
- [x] Quick "Log an Action" form
- [x] Days where contact was selected in daily checklist
- [x] Auto-layout based on contact type (wormholes show all fields)
- [x] "Show all fields" toggle for other contact types

### Phase 7 - Goal Progress Tracking
- [x] Goal deadline and target_number
- [x] Daily progress check-in (POST /api/goals/progress)
- [x] Progress status calculation: crushing_it, on_track, showing_up, leaning_off, needs_support
- [x] Status ring colors for community avatars
- [x] Points for daily progress updates
- [x] On-track bonus points

### Phase 8 - Community Features
- [x] Community feed with signal completions and help requests
- [x] Leaderboard by points
- [x] Member directory with search
- [x] Member profiles (company, social, services, connections)
- [x] Profile icon on community header for quick access
- [x] Status ring around avatars (green, maroon-blue, orange, red)
- [x] Help request system for off-track users
- [x] Messages button for accessing DMs

### Phase 9 - Direct & Group Messaging
- [x] Direct messages between community members
- [x] Conversations list with unread count
- [x] Group chat creation with multiple members
- [x] Group messaging with chat UI
- [x] Message notifications (push enabled)
- [x] Messages screen accessible from Community

### Phase 10 - Push Notifications (NEW)
- [x] **Expo Push Service Integration** (free, no signup required)
- [x] Push token registration (POST /api/notifications/push-token)
- [x] Message notifications (new message alerts)
- [x] Deal reminder notifications (close date alerts)
- [x] Daily check-in reminders
- [x] **Notification Settings:**
  - Daily check-in reminder (customizable time)
  - Deal close date reminders (smart timing)
  - Community notifications
  - Message notifications

### Phase 11 - Profile & Storage (NEW)
- [x] **Cloud Storage for Profile Photos** via Emergent Object Storage
- [x] Profile photo upload (base64)
- [x] File reference storage in MongoDB
- [x] Photo delete functionality
- [x] Show/hide goal status ring toggle

## Navigation Structure (UPDATED)
- **Daily** (⚡) - Daily tracking, signals list, AI coaching
- **Dashboard** (📊) - Stats, streaks, heatmap, goals
- **Community** (🏆) - Leaderboard, Feed, Directory, Messages
- **CRM** (🌀) - Deals + Contacts tabs, wormhole detail view
- **Settings** (⚙️) - User profile, photo upload, notification settings

## API Endpoints

### Authentication
- POST /api/register, POST /api/login, GET /api/auth/me

### Dashboard
- GET /api/dashboard/stats

### Signals
- GET/POST /api/signals
- POST /api/signals/{id}/complete

### CRM - Contacts
- GET/POST /api/wormhole-contacts
- PUT/DELETE /api/wormhole-contacts/{id}
- GET /api/wormhole-contacts/options (all field options)
- POST /api/wormhole-contacts/{id}/logs
- GET /api/wormhole-contacts/{id}/logs

### CRM - Deals
- GET/POST /api/deals
- PUT/DELETE /api/deals/{id}
- GET /api/deals/notifications (smart notifications)

### Goals
- GET/POST /api/goals
- POST /api/goals/progress
- GET /api/goals/status

### Community
- GET /api/community/feed
- POST /api/community/help-request
- GET /api/community/members

### Messaging
- POST /api/messages/direct
- GET /api/messages/direct/{user_id}
- GET /api/messages/conversations
- POST/GET /api/messages/groups
- POST/GET /api/messages/groups/{group_id}

### Notifications
- POST /api/notifications/push-token
- GET/PUT /api/notifications/settings

### Profile & Storage
- GET/PUT /api/profiles/me
- POST /api/profiles/photo (multipart upload)
- PUT /api/profiles/photo (base64 upload)
- DELETE /api/profiles/photo
- GET /api/files/{path} (download from cloud storage)

## Database Collections
- users, goals, signals, signal_completions
- deals, wormhole_contacts, wormhole_logs
- daily_entries, profiles, member_profiles
- user_points, compound_habits, help_requests
- messages, group_chats
- push_tokens, notification_settings, notifications
- files (cloud storage references)

## Testing Status (Updated March 4, 2026)
- Backend: 95% pass rate (90/95 tests)
- Frontend: 100% pass rate (37/37 tests)
- Test files: /app/backend/tests/, /app/tests/e2e/
- Latest report: /app/test_reports/iteration_5.json

## Pending/Backlog

### P1 - Medium Priority
- [ ] Real-time messaging with WebSocket (currently polling)
- [ ] Background push notification scheduling

### P2 - Future Enhancements
- [ ] Premium tiers and coaching integrations
- [ ] Social accountability groups
- [ ] Public streak sharing
- [ ] Community challenges
- [ ] Refactor server.py into APIRouter modules
- [ ] Refactor crm.tsx into smaller components

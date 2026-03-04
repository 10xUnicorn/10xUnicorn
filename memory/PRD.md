# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is an integrated goal execution dashboard, relationship intelligence system, and community performance platform for business owners. It combines daily habit tracking, CRM functionality, community features, and direct messaging.

## Tech Stack
- **Frontend:** Expo (React Native), TypeScript, Expo Router
- **Backend:** FastAPI, Python, MongoDB
- **Authentication:** JWT-based
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key

## Implemented Features (As of March 2026)

### Phase 1 - Core Foundation
- [x] User Authentication (register, login, JWT)
- [x] Onboarding flow (name, timezone, 10x goal)
- [x] Dark futuristic UI theme (navy, purple, cyan)
- [x] Today screen with date navigation

### Phase 2 - Today Screen & Daily Tracking
- [x] Determination Level slider (0-10) with emoji feedback
- [x] 10x Focus section with Top 10x Action (special signal worth 10 points)
- [x] Five Core Actions checklist
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

### Phase 4 - CRM System (Consolidated)
- [x] Single CRM tab with Deals + Contacts sub-tabs
- [x] **Contact Labels:** prospect, referral_partner, strategic_partner, client, wormhole, resource
- [x] **Connection Levels:** new_connection, building, warm_local, warm_intl, active_professional, close_personal, mid_aspirational (colored pills)
- [x] **Contact Tags:** business_owner, influencer, speaker, access, mindset, future_self, community_partner, etc.
- [x] **Workflow Fields:** activation_next_step, last_contact_date, set_meeting, preferred_platform, power_leverage
- [x] **Engagement Tracking:** engagement_level, engagement_types, tagging_in_posts, tagging_in_comments
- [x] **Reciprocity Notes:** value exchange documentation
- [x] Deal stages: lead, qualified, proposal, negotiation, closed_won, closed_lost
- [x] Deal close_date with smart notifications
- [x] Deal priority calculation based on value/stage/timing

### Phase 5 - Wormhole System (Enhanced Contacts)
- [x] Wormhole Detail Page with full editable profile
- [x] **Logs Timeline:** wormhole_logs collection per contact
- [x] **Log Action Types:** call, meeting, dm, email, coffee_chat, collaboration, intro_made, follow_up
- [x] Quick "Log an Action" form
- [x] Days where contact was selected in daily checklist
- [x] Auto-layout based on contact type (wormholes show all fields)
- [x] "Show all fields" toggle for other contact types

### Phase 6 - Goal Progress Tracking
- [x] Goal deadline and target_number
- [x] Daily progress check-in (POST /api/goals/progress)
- [x] Progress status calculation: crushing_it, on_track, showing_up, leaning_off, needs_support
- [x] Status ring colors for community avatars
- [x] Points for daily progress updates
- [x] On-track bonus points

### Phase 7 - Community Features
- [x] Community feed with signal completions and help requests
- [x] Leaderboard by points
- [x] Member directory with search
- [x] Member profiles (company, social, services, connections)
- [x] Profile icon on community header for quick access
- [x] Status ring around avatars (green, maroon-blue, orange, red)
- [x] Help request system for off-track users
- [x] Messages button for accessing DMs

### Phase 8 - Direct & Group Messaging
- [x] Direct messages between community members
- [x] Conversations list with unread count
- [x] Group chat creation with multiple members
- [x] Group messaging
- [x] Message notifications (stored for push)
- [x] Messages screen under Community tab

### Phase 9 - Notifications & Profile
- [x] **Notification Settings:**
  - Daily check-in reminder (customizable time)
  - Deal close date reminders (smart timing)
  - Community notifications
  - Message notifications
- [x] **Profile Photo Upload:** Base64 image upload with camera icon
- [x] Photo picker using expo-image-picker
- [x] Show/hide goal status ring toggle

## Navigation Structure
- **Today** - Daily tracking, signals list, AI coaching
- **CRM** - Deals + Contacts tabs, wormhole detail view
- **Community** - Leaderboard, Feed, Directory, Messages access
- **Profile** - User profile, photo upload, notification settings

## API Endpoints

### Authentication
- POST /api/register, POST /api/login, GET /api/auth/me

### Signals
- GET/POST /api/signals
- POST /api/signals/{id}/complete

### CRM - Contacts
- GET/POST /api/wormhole-contacts
- GET /api/wormhole-contacts/labels
- GET /api/wormhole-contacts/options (all field options)
- POST /api/wormhole-contacts/{id}/logs
- GET /api/wormhole-contacts/{id}/logs
- GET /api/wormhole-contacts/{id}/timeline

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
- GET /api/member/{user_id}

### Messaging
- POST /api/messages/direct
- GET /api/messages/direct/{user_id}
- GET /api/messages/conversations
- POST/GET /api/messages/groups
- POST/GET /api/messages/groups/{group_id}

### Notifications
- POST /api/notifications/push-token
- GET/PUT /api/notifications/settings

### Profile
- GET/PUT /api/profiles/me
- PUT /api/profiles/photo
- DELETE /api/profiles/photo

## Database Collections
- users, goals, signals, signal_completions
- deals, wormhole_contacts, wormhole_logs
- daily_entries, profiles, member_profiles
- user_points, compound_habits, help_requests
- messages, group_chats, push_tokens, notification_settings, notifications

## Pending/Backlog

### P1 - Medium Priority
- [ ] Push notification delivery (integrate with Expo Push Service)
- [ ] Real-time messaging updates

### P2 - Future
- [ ] Premium tiers and coaching integrations
- [ ] Social accountability groups
- [ ] Public streak sharing
- [ ] Community challenges

## Testing Status
- Backend: 95% pass rate (90/95 tests)
- Frontend: 100% pass rate (22/22 tests)
- Test files: /app/backend/tests/, /app/tests/e2e/

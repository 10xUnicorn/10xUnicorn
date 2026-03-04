# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is an integrated goal execution dashboard, relationship intelligence system, and community performance platform for business owners. It combines daily habit tracking, CRM functionality, and community features into a single mobile application.

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

### Phase 2 - Today Screen
- [x] Determination Level slider (0-10) with emoji feedback
- [x] Intention field
- [x] 10x Focus section
- [x] Five Core Actions checklist
- [x] Compound Habit tracking with streaks
- [x] Distraction Reflection
- [x] AI Course Correction (OpenAI integration)

### Phase 3 - Signals System
- [x] Create signals with impact rating (1-10)
- [x] Signal due date with MM/DD/YY format
- [x] Calendar default: today (before 3 PM) or tomorrow (after 3 PM)
- [x] Link signals to deals
- [x] Top 10x Action as special signal (10 points)
- [x] Signal completion with points
- [x] Planned ahead bonus
- [x] Before 6 PM bonus

### Phase 4 - CRM System (NEW)
- [x] Consolidated CRM tab (Deals + Contacts)
- [x] Contact Labels: prospect, referral_partner, strategic_partner, client, wormhole, resource
- [x] Contact filter by label
- [x] Deals with close_date (MM/DD/YY)
- [x] Smart deal notifications based on priority/value/timing
- [x] Notifications enable/disable per deal
- [x] Deal stages: lead, qualified, proposal, negotiation, closed_won, closed_lost
- [x] Link contacts to deals

### Phase 5 - Goal Progress Tracking (NEW)
- [x] Goal deadline and target_number
- [x] Daily progress check-in (POST /api/goals/progress)
- [x] Progress status calculation: crushing_it, on_track, showing_up, leaning_off, needs_support
- [x] Status ring colors for community avatars
- [x] Points for daily progress updates
- [x] On-track bonus points

### Phase 6 - Community Features
- [x] Community feed with signal completions
- [x] Help requests in feed
- [x] Leaderboard by points
- [x] Member directory with search
- [x] Member profiles (company, social, services, etc.)
- [x] Profile icon on community page header
- [x] Status ring around avatars (green, maroon-blue, orange, red)
- [x] Help request system

## Navigation Structure
- **Today** - Daily tracking, signals, AI coaching
- **CRM** - Deals and Contacts tabs
- **Community** - Leaderboard, Feed, Directory
- **Profile** - User profile and settings

## API Endpoints

### Authentication
- POST /api/register
- POST /api/login
- GET /api/auth/me

### Signals
- GET/POST /api/signals
- POST /api/signals/{id}/complete

### CRM
- GET/POST /api/deals
- GET /api/deals/{id}
- PUT /api/deals/{id}
- DELETE /api/deals/{id}
- GET /api/deals/notifications
- GET/POST /api/wormhole-contacts
- GET /api/wormhole-contacts/labels

### Goals
- GET/POST /api/goals
- POST /api/goals/progress
- GET /api/goals/status
- GET /api/goals/user/{user_id}/status

### Community
- GET /api/community/feed
- POST /api/community/help-request
- GET /api/community/members
- GET /api/member/{user_id}
- GET/PUT /api/profiles/me
- GET /api/points/leaderboard

## Pending/Backlog

### P0 - High Priority
- [ ] Profile photo upload UI and backend

### P1 - Medium Priority
- [ ] Push notifications for deals
- [ ] Direct messaging
- [ ] Group messaging

### P2 - Future
- [ ] Premium tiers
- [ ] Coaching integrations
- [ ] Social accountability groups
- [ ] Public streak sharing
- [ ] Community challenges

## Known Issues
- Expo tunnel can be unstable (ngrok service)
- ESLint not configured for TypeScript

## Database Collections
- users
- goals
- signals
- signal_completions
- deals
- wormhole_contacts
- daily_entries
- profiles
- member_profiles
- user_points
- compound_habits
- help_requests

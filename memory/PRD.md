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

## Navigation Structure (March 4, 2026)
- **Daily** (⚡ flash icon) - Daily tracking, determination slider, signals
- **Dashboard** (📊 bar-chart icon) - Stats, streaks, heatmap, goals
- **Community** (🏆 trophy icon) - Leaderboard, Feed, Directory
- **CRM** (🌀 planet icon) - **Signals → Contacts → Deals** tabs
- **Profile** (👤 person icon) - Profile settings, emoji picker, goals

## Implemented Features (As of March 4, 2026)

### Tab Layout
- [x] Dashboard icon: gray bar-chart (Ionicons `bar-chart`)
- [x] Tab renamed: Settings → Profile
- [x] Tab order: Daily, Dashboard, Community, CRM, Profile

### Today Screen
- [x] **Collapsible Determination Slider**
  - Fluid gradient (orange→red→purple), fire emoji thumb
  - Collapsed view: emoji + value + "Check In" button
  - Auto-collapses after setting, expands on tap
  - Inspiration messages when determination < 8
- [x] **"Who are you being today? I am ____"** intention format
- [x] **Glowing Complete Button** for Top 10x Action
  - Large circular button with glow effect
  - Shows 🔥 fire emoji when completed
  - Edit button to navigate to signal details
- [x] 10x Unicorn Checklist (5 items with descriptions)
- [x] **Compound Habit Counter Modal**
  - Ask "How many times?" when marking complete
  - Counter with +/- buttons
  - Progress bar toward target
  - Can add more later (press + button)

### CRM System
- [x] **Tab order: Signals, Contacts, Deals**
- [x] Signals list with edit capability
- [x] Contact labels and connection levels
- [x] Deal tracking with close_date notifications

### Profile & Personalization
- [x] **Profile emoji picker** (16 emoji options)
- [x] **First name field** for "FirstName + Emoji" display
- [x] Edit profile includes 10x Goal and Compound Habit
- [x] Photo upload via cloud storage
- [x] Notification settings

### Push Notifications
- [x] Expo Push Service integration
- [x] **Streak Milestone Notifications**:
  - 7 days: 🔥 "7-Day Streak!" 
  - 14 days: ⚡ "14-Day Streak!"
  - 30 days: 💎 "30-Day Streak!"
  - 60 days: 🚀 "60-Day Streak!"
  - 90 days: 🏆 "90-Day Streak!"
  - 180 days: 👑 "180-Day Streak!"
  - 365 days: 🦄 "365-Day Streak!"
- [x] Message notifications
- [x] Deal reminder notifications
- [x] Daily check-in reminders

### Dashboard
- [x] My 10x Goal Card with Edit button
- [x] Stats Grid: Current/Best Streak, Unicorn Days, Priority Wins
- [x] Last 7 Days circular indicators
- [x] Determination Trend bar chart
- [x] Activity Heatmap (GitHub-style, 365 days)
- [x] Wormhole Network Summary

### Community
- [x] Public feed with signal completions
- [x] Leaderboard by points
- [x] Member directory with search
- [x] Status rings around avatars

### Signals System
- [x] Create/edit signals with impact rating
- [x] Signal due date and deal association
- [x] Signal completion with points
- [x] **Signal uncomplete endpoint**

## API Endpoints

### Profile
- GET/PUT /api/profile (now with first_name, profile_emoji, upsert)
- PUT /api/member/profile
- PUT /api/goal
- PUT /api/compound-habit

### Daily Entry
- GET/PUT /api/daily-entry/{date} (includes compound_count)

### Signals
- GET/POST /api/signals
- PUT/DELETE /api/signals/{id}
- POST /api/signals/{id}/complete
- POST /api/signals/{id}/uncomplete

### Push Notifications
- POST /api/notifications/push-token
- GET/PUT /api/notifications/settings

## Database Collections
- users, profiles, goals, signals, signal_completions
- daily_entries (compound_count field)
- wormhole_contacts, wormhole_logs
- deals, member_profiles
- push_tokens, notification_settings, notifications
- achievements (streak milestones)
- files (cloud storage)

## Testing Status (March 4, 2026)
- Backend: 96% (119/124 tests)
- All new features verified working
- Test files: /app/backend/tests/
- Latest report: /app/test_reports/iteration_7.json

## Known Issues (Pre-existing)
1. engagement_strength not persisted in wormhole contact update
2. planned_ahead bonus calculation in signal completion
3. Top 10x action duplicate check - date format mismatch

## Pending Items
- [ ] Rich text formatting in signal notes (bold, italic, underline)
- [ ] Activity level rings based on streak colors
- [ ] Real-time messaging with WebSocket

## Browser Cache Note
**IMPORTANT**: If changes don't appear, hard refresh browser:
- Windows/Linux: Ctrl+Shift+R
- Mac: Cmd+Shift+R
- Or clear browser cache and reload

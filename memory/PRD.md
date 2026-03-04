# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is a **10x goal execution dashboard, relationship intelligence CRM, and community performance platform for business owners**. The system helps users identify daily priorities, take aligned actions toward their goal, activate high-leverage relationships, build compounding habits, track measurable signals of progress, earn points for aligned execution, and participate in a community of builders doing the same challenge.

## Tech Stack
- **Frontend**: Expo React Native (SDK 54) with expo-router (file-based routing)
- **Backend**: FastAPI (Python) with MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT-based email/password authentication

## Design System
- **Theme**: Deep navy space background (`#0a0a1a`)
- **Primary**: Electric purple (`#A855F7`)
- **Secondary**: Magenta/pink (`#D946EF`)
- **Accent**: Cyan/teal (`#06B6D4`)
- **Red**: For "10x" branding (`#EF4444`)
- **Cards**: `#12122a` with `#2D2D50` borders

## Core Features

### 1. Authentication
- Email + password registration and login
- JWT session persistence (30 days)
- Password change, account deletion

### 2. Onboarding Flow (4 Steps)
1. Display Name
2. Timezone selection
3. 10x Goal (title + description)
4. Daily Compound Habit

### 3. Today Page (Center of Gravity)
- **Fluid Determination Slider**: 0-10 continuous draggable slider with emoji indicators (😴→😐→😤→🔥→🦄)
- **Intention**: "What kind of person are you being today?"
- **10x Focus**: Main goal with top action checkbox
- **Five Core Actions**:
  1. Top 10x Action Item
  2. 7-Minute Future Self Meditation
  3. Wormhole Relationship
  4. Avoid Distractions
  5. Plan the Next Day Ahead of Time
- **Win Logic**: Priority Win (top action) → 10x Unicorn Win (all 5)
- **Wormhole Section**: Relationship leverage input
- **Daily Compound**: Habit checkbox with streak counter
- **Distraction Reflection**: Notes + course-correct toggle
- **AI Course Correction**: Launch AI coaching session

### 4. Signals & Points System (NEW)
**Signals**: Measurable actions tied to 10x goal
- Signal name, description, base points
- Public/private toggle (blue globe icon)
- Completion tracking with notes

**Points System**:
- Base signal points (configurable per signal)
- Bonus: +5 for planning signals the night before
- Bonus: +10 for completing before 6 PM
- Bonus: +20 for completing all signals (3+ signals)
- Bonus: +2 per day of signal streak
- Bonus: +15 for Top 10x Action
- Bonus: +10 for Wormhole action
- Bonus: impact_rating × 0.5 for high-impact wormhole actions
- Bonus: +50 for 10x Unicorn Win

**Leaderboard**: Ranked by total points, showing:
- Member name, 10x Goal, Total Points, Weekly Points, Signal Streak

**Community Feed**: Public signal completions showing:
- Who completed what signal, points earned, notes

### 5. Wormhole Contact System (Expanded CRM)
**Contact Profile Fields:**
- **Identity**: Name, Company, Title/Role, Location
- **Contact Info**: Website, Email, Phone
- **Social Media**: LinkedIn, Twitter/X, Instagram, YouTube, TikTok, Other
- **Leverage Potential**: Categories + Description
  - Categories: Investor, Strategic Partner, Distribution Partner, Media, Influencer, Connector, Industry Authority
- **Best Contact Method**: Email, LinkedIn DM, Text, Phone, Warm Intro, In Person, Other
- **Relationship Intelligence**: Connection Level (cold/warm/hot/close), Tags, Engagement Strength (1-10)
- **Activation**: Next Step, Notes
- **Interaction History**: Timeline with action types and impact ratings

**Interaction Logging**:
- Action Types: sent_intro_email, followed_up, scheduled_meeting, commented_post, made_introduction, had_call, sent_proposal, met_in_person, other
- Impact Rating (1-10): Higher impact = more bonus points
- Automatic updates to Last Contact Date and Engagement Score

### 6. Momentum Dashboard
- Active 10x Goal display
- Compound streak with 7/30/90-day percentages
- Win Performance metrics
- Core Action completion rates
- Determination trend
- Wormhole Network metrics

### 7. Profile Management
- Edit display name, 10x goal, compound habit
- View timezone and member-since date
- Logout / Delete Account

---

## Implementation Status

### ✅ Phase 1 Complete
- [x] Updated color scheme (deep navy, electric purple, cyan, red 10x)
- [x] Fluid determination slider with emoji indicators
- [x] Updated five core actions
- [x] Updated win/loss logic
- [x] Expanded Wormhole contact schema

### ✅ Phase 2 Complete (Signals & Points)
- [x] Signal CRUD operations
- [x] Signal completion with base + bonus points
- [x] Planned ahead bonus (+5)
- [x] Before 6PM bonus (+10)
- [x] All signals complete bonus (+20)
- [x] Signal streak tracking
- [x] Points summary endpoint
- [x] Leaderboard endpoint
- [x] Community feed endpoint
- [x] Daily bonuses endpoint (top action, wormhole, unicorn win)
- [x] Public/private toggle for signals
- [x] Signals tab in navigation

### ✅ Phase 3 Complete (Expanded Wormhole CRM UI)
- [x] Full contact profile UI with all fields
- [x] Social media handles input
- [x] Leverage categories selector
- [x] Best contact method selector
- [x] Connection level selector
- [x] Engagement strength slider (1-10)
- [x] Action type selector in interaction logging
- [x] Impact rating slider (1-10)
- [x] Interaction history with type and impact display

### 🔵 Phase 4: Community Features (Next)
- [ ] Member profiles with strategic connection fields
- [ ] Public signal feed UI
- [ ] Leaderboard UI
- [ ] Member directory with filters

### 🔵 Phase 5: Deals CRM & Matching
- [ ] Deal tracking (contact, value, stage)
- [ ] Needs categories (Capital, Marketing, etc.)
- [ ] Service matching

### 🔵 Phase 6: Messaging
- [ ] Direct messaging
- [ ] Group chats

---

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Profile & Onboarding
- POST /api/onboarding
- GET /api/profile
- PUT /api/profile

### Daily Entries
- GET /api/daily-entry/{date}
- PUT /api/daily-entry/{date}
- POST /api/daily-entry/{date}/award-bonuses

### Signals & Points
- GET /api/signals
- POST /api/signals
- PUT /api/signals/{id}
- DELETE /api/signals/{id}
- POST /api/signals/{id}/complete
- GET /api/signal-completions
- GET /api/points/summary
- GET /api/points/leaderboard
- GET /api/community/feed

### Wormhole Contacts
- GET /api/wormhole-contacts
- POST /api/wormhole-contacts
- PUT /api/wormhole-contacts/{id}
- DELETE /api/wormhole-contacts/{id}
- POST /api/wormhole-contacts/interaction
- POST /api/wormhole-contacts/import-bulk

### Dashboard
- GET /api/dashboard/stats
- GET /api/compound-streak

### AI
- POST /api/ai/session
- POST /api/ai/session/{id}/message

---

## Future Enhancements
- Push notifications for daily reminders
- Public streak sharing
- Social accountability groups
- Community challenges
- Premium tiers
- Coaching integrations

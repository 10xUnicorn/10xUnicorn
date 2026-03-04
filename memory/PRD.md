# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is a **10x goal execution dashboard, relationship intelligence CRM, and community performance platform for business owners**. The system helps users identify daily priorities, take aligned actions toward their goal, activate high-leverage relationships, build compounding habits, track measurable signals of progress, earn points for aligned execution, and participate in a community of builders doing the same challenge.

## Tech Stack
- **Frontend**: Expo React Native (SDK 54) with expo-router
- **Backend**: FastAPI (Python) with MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT-based email/password authentication

## Design System
- **Background**: Deep navy (`#0a0a1a`)
- **Primary**: Electric purple (`#A855F7`)
- **Secondary**: Magenta (`#D946EF`)
- **Accent**: Cyan (`#06B6D4`)
- **Red**: "10x" branding (`#EF4444`)

## Navigation (5 Tabs)
1. **Today** - Daily execution center
2. **Signals** - Goal progress tracking with points
3. **Community** - Leaderboard, Feed, Directory
4. **Wormhole** - Relationship CRM
5. **Profile** - User settings

## Core Features

### 1. Today Page
- Fluid determination slider (0-10 with emojis: 😴→😐→😤→🔥→🦄)
- Five Core Actions:
  - Top 10x Action Item
  - 7-Minute Future Self Meditation
  - Wormhole Relationship
  - Avoid Distractions
  - Plan the Next Day Ahead of Time
- Win Logic: Priority Win (top action) → Unicorn Win (all 5)
- Distraction reflection with course-correct toggle
- AI Course Correction button

### 2. Signals & Points System
- Signal creation tied to 10x goal
- Completion with bonus points:
  - +5 planned ahead
  - +10 before 6PM
  - +20 all signals complete
  - +15 top action
  - +10 wormhole action
  - +50 unicorn win
- Public/private toggle (blue globe icon)
- Signal streaks

### 3. Community Features
- **Leaderboard**: Ranked by total points with streaks
- **Activity Feed**: Public signal completions
- **Member Directory**: Searchable with filters
- **Member Profiles**: Bio, services, needs, goals

### 4. Wormhole CRM
- Full contact profiles:
  - Identity (name, company, title, location)
  - Contact info (email, phone, website)
  - Social media (LinkedIn, Twitter, Instagram, YouTube, TikTok)
  - Leverage potential (categories + description)
  - Best contact method
  - Connection level (cold/warm/hot/close)
  - Engagement strength (1-10)
- Interaction logging with action types and impact ratings

### 5. Member Profile Fields
- Bio, company description
- Industries, skills, services offered
- Needs (what resources they seek)
- Good connection for, seeking partnerships
- Target wormhole relationships

---

## Implementation Status

### ✅ Phase 1: Foundation
- Updated color scheme
- Fluid determination slider
- Five core actions
- Win logic
- Expanded contact schema

### ✅ Phase 2: Signals & Points
- Signal CRUD
- Point tracking with bonuses
- Leaderboard API
- Community feed API

### ✅ Phase 3: Expanded Wormhole CRM
- Full contact profile UI
- Action type selector
- Impact rating

### ✅ Phase 4: Community Features
- Leaderboard UI with rankings
- Activity feed UI
- Member directory with search
- Member profile modal
- Member profile endpoints
- Industries/services lists

### 🔵 Phase 5: Deals CRM (Next)
- Deal tracking (contact, value, stage)
- Needs categories
- Service matching

### 🔵 Phase 6: Messaging
- Direct messaging
- Group chats

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
- GET /api/member/profile
- PUT /api/member/profile

### Daily Entries
- GET /api/daily-entry/{date}
- PUT /api/daily-entry/{date}
- POST /api/daily-entry/{date}/award-bonuses

### Signals & Points
- CRUD /api/signals
- POST /api/signals/{id}/complete
- GET /api/signal-completions
- GET /api/points/summary
- GET /api/points/leaderboard

### Community
- GET /api/community/feed
- GET /api/community/members
- GET /api/member/{user_id}
- GET /api/community/industries
- GET /api/community/services

### Wormhole Contacts
- CRUD /api/wormhole-contacts
- POST /api/wormhole-contacts/interaction

---

## Future Enhancements
- Push notifications
- Public streak sharing
- Premium tiers
- Coaching integrations

# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is a **10x goal execution dashboard, relationship intelligence CRM, and community performance platform for business owners**.

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

## Navigation (5 Tabs)
1. **Today** - Daily execution center
2. **Signals** - Goal progress tracking with points
3. **Community** - Leaderboard, Feed, Directory
4. **Wormhole** - Relationship CRM
5. **Profile** - Member profile & settings

---

## Core Features

### 1. Signals & Points System
**Signals** are measurable actions tied to the user's 10x goal.

**Signal Fields:**
- Name, Description
- Impact Rating (1-10 slider) = Points value
- Due Date (YYYY-MM-DD)
- Public/Private toggle (blue globe icon)

**Auto-Calculated Bonuses:**
- +5 **Planned Ahead** (due date ≥1 day after creation)
- +10 **Before 6 PM**
- +20 **All Signals Complete** (3+ signals)
- +15 **Top 10x Action**
- +10 **Wormhole Action**
- +50 **10x Unicorn Win**

### 2. Member Profile (Full Profile Fields)
**Basic Info:**
- Display Name
- Company Name
- Website
- Email
- Phone
- Booking Link

**Social Media:**
- LinkedIn
- Twitter
- Instagram
- YouTube
- TikTok

**Business Profile:**
- Bio
- What they're working on
- Services Offered (multi-select)
- Target Customer

**Connection Profile:**
- Who they are a good connection for
- Who a warm connection is
- Who a golden/ideal connection is
- Strategic partnerships they seek

### 3. Deals CRM
**Deal Fields:**
- Name
- Associated Contact (from Wormhole)
- Company
- Value ($)
- Stage (lead → qualified → proposal → negotiation → closed_won/closed_lost)
- Notes
- Needs Categories
- Financial Services Needed
- Other Needs (custom tags)
- Linked Signals

**Needs Categories:**
Capital, Marketing, Social Media, Community Management, Operations, Tech Development, Podcast Booking, Speaking, Sponsorships, Events, Communities, Financial Services, Coaching, Design, Sales, Legal, HR

**Financial Services:**
Accounting, Bookkeeping, Tax Planning, Financial Planning, Wealth Management, Venture Capital, Private Equity, Angel Investment, Debt Financing, Revenue Based Financing, Fractional CFO, M&A Advisory, Fundraising Strategy

### 4. Service Matching
- Find community members who offer services matching your needs
- Match by service type, industry, deal needs
- Display: company info, booking link, services, target customer, points

---

## Implementation Status

### ✅ Complete

**Phase 1: Foundation**
- Color scheme, fluid determination slider, five core actions, win logic

**Phase 2: Signals & Points**
- Signal CRUD with impact rating (1-10) and due dates
- Auto-calculated planned_ahead bonus
- Points summary, leaderboard, community feed

**Phase 3: Expanded Wormhole CRM**
- Full contact profile with all fields
- Interaction logging with action types and impact ratings

**Phase 4: Community Features**
- Leaderboard UI
- Activity feed UI
- Member directory with search
- Member profile modal

**Phase 5: Deals CRM & Service Matching**
- Deal CRUD with stages, needs, value
- Link signals to deals
- Service matching by deal needs
- Provider search by service type
- Full member profile editor with all new fields

---

## API Endpoints Summary

### Signals
- `GET/POST /api/signals`
- `PUT/DELETE /api/signals/{id}`
- `POST /api/signals/{id}/complete`

### Points & Community
- `GET /api/points/summary`
- `GET /api/points/leaderboard`
- `GET /api/community/feed`
- `GET /api/community/members`

### Member Profile
- `GET/PUT /api/member/profile`
- `GET /api/member/{user_id}`

### Deals
- `GET/POST /api/deals`
- `PUT/DELETE /api/deals/{id}`
- `POST /api/deals/{id}/link-signal/{signal_id}`
- `GET /api/deals/stages/list`
- `GET /api/deals/needs/list`

### Service Matching
- `GET /api/matching/providers`
- `GET /api/matching/for-deal/{deal_id}`

### Wormhole
- `GET/POST /api/wormhole-contacts`
- `PUT/DELETE /api/wormhole-contacts/{id}`
- `POST /api/wormhole-contacts/interaction`

---

## Remaining Work

### 🔵 Phase 6: Messaging
- [ ] Direct messaging between members
- [ ] Group chats

### 🔵 Future
- Push notifications
- Premium tiers
- Public streak sharing

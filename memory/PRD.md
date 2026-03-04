# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is a **10x goal execution dashboard, relationship intelligence CRM, and community performance platform for business owners**. The system helps users identify daily priorities, take aligned actions toward their goal, activate high-leverage relationships, build compounding habits, track measurable signals of progress, and participate in a community of ambitious builders.

## Tech Stack
- **Frontend**: Expo React Native (SDK 54) with expo-router (file-based routing)
- **Backend**: FastAPI (Python) with MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (emergentintegrations library)
- **Auth**: JWT-based email/password authentication

## Design System (Updated)
- **Theme**: Deep navy space background (`#0a0a1a`)
- **Primary**: Electric purple (`#A855F7`)
- **Secondary**: Magenta/pink (`#D946EF`)
- **Accent**: Cyan/teal (`#06B6D4`)
- **Red**: For "10x" branding (`#EF4444`)
- **Cards**: `#12122a` with `#2D2D50` borders
- **Typography**: Bold, futuristic aesthetic
- **Navigation**: Bottom tabs (Today, Momentum, Wormhole, Profile)

## Core Features

### 1. Authentication
- Email + password registration and login
- JWT session persistence (30 days)
- Password change
- Account deletion with full data cleanup
- User data isolation

### 2. Onboarding Flow (4 Steps)
1. Display Name
2. Timezone selection
3. 10x Goal (title + optional description)
4. Daily Compound Habit

### 3. Today Page (Center of Gravity)
- **Date Navigation**: Yesterday | Today | Tomorrow with auto-create
- **Status Banner**: Shows computed/override status with color coding
- **Fluid Determination Slider**: 0-10 continuous draggable slider with emoji indicators:
  - 0-2 → 😴
  - 3-4 → 😐
  - 5-6 → 😤
  - 7-9 → 🔥
  - 10 → 🦄
- **Intention**: "What kind of person are you being today?"
- **10x Focus**: Large prominent mission input with top action checkbox
- **Five Core Actions** (Updated):
  1. Top 10x Action Item
  2. 7-Minute Future Self Meditation
  3. Wormhole Relationship
  4. Avoid Distractions
  5. Plan the Next Day Ahead of Time
- **Wormhole Section**: Relationship leverage input with link to contacts
- **Daily Compound**: Habit checkbox with streak counter + optional notes
- **Distraction Reflection**: Notes + course-correct toggle
- **AI Course Correction**: Button to launch AI coaching session

### 4. Win Logic Engine (Updated)
| Status | Condition |
|--------|-----------|
| `unicorn_win` | All 5 core actions complete (10x Unicorn Win!) |
| `priority_win` | Top 10x Action Item completed |
| `course_corrected` | AI session completed |
| `loss` | Actions started but insufficient |
| `ready` | No actions taken yet |
| `lesson` | Manual override only |

Manual override always supersedes computed status.

### 5. AI Course Correction Engine
- Contextual coaching using user's actual data (determination, intention, focus, actions, distractions)
- Multi-turn conversation with structured coaching protocol
- Generates execution plans with 2-min first steps, timeboxing, definition of done
- Marks day as "course_corrected" upon session completion

### 6. Wormhole Contact System (Expanded CRM)
**Contact Profile Fields:**
- **Identity**: Name, Company, Title/Role, Location
- **Contact Info**: Website, Email, Phone
- **Social Media**: LinkedIn, Twitter/X, Instagram, YouTube, TikTok, Other
- **Leverage Potential**: Categories (Investor, Strategic Partner, Distribution Partner, Media, Influencer, Connector, Industry Authority) + Description
- **Best Contact Method**: Email, LinkedIn DM, Text, Phone, Warm Intro, In Person, Other
- **Relationship Intelligence**: Connection Level (cold/warm/hot/close), Tags, Engagement Strength (1-10)
- **Next Steps**: Activation Next Step, Notes
- **Interaction History**: Timeline of all logged interactions

**Interaction Logging:**
- Action Type (sent_intro_email, followed_up, scheduled_meeting, commented_post, made_introduction, etc.)
- Action Text
- Impact Rating (1-10)
- Automatic updates to Last Contact Date and Engagement Score

### 7. Momentum Dashboard
- Active 10x Goal display
- Compound streak (current + 7/30/90-day percentages)
- Win Performance (Win Rate, Unicorn Rate, Current/Longest Streak)
- Win breakdown (Unicorn Wins, Priority Wins, Course Corrected, Total)
- Core Action completion rates
- Determination trend (7-day)
- Wormhole Network metrics (top contacts by engagement)

### 8. Profile Management
- Edit display name, 10x goal, compound habit
- View timezone and member-since date
- Logout / Delete Account

## Data Models (Updated)
- **users**: id, email, password_hash, onboarded, created_at
- **profiles**: user_id, display_name, timezone_str
- **goals**: id, user_id, title, description, start_date, end_date, active
- **compound_habits**: user_id, habit_title
- **daily_entries**: user_id, date, determination_level, intention, ten_x_focus, top_10x_action_text, top_priority_completed, five_item_statuses (top_action, meditation, wormhole, distractions, plan_tomorrow), wormhole_contact_id, wormhole_action_text, wormhole_action_type, wormhole_impact_rating, distraction_notes, immediate_course_correction, compound_done, compound_notes, computed_status, manual_override_status, final_status, ai_course_corrected
- **wormhole_contacts**: id, user_id, name, company, title, location, website, email, phone, linkedin, twitter, instagram, youtube, tiktok, other_social, leverage_categories, leverage_description, best_contact_method, connection_level, tags, engagement_strength, engagement_score, activation_next_step, notes, last_contact_date, interaction_history
- **ai_sessions**: id, user_id, date_reference, conversation_log, marked_complete

## API Routes (all prefixed with /api)
- Auth: register, login, me, change-password, account delete
- Onboarding: complete onboarding
- Profile: get/update profile, goal, habit
- Daily Entries: get/update by date, list, move
- Wormhole: CRUD contacts, log interaction (with action_type, impact_rating), bulk import
- AI Sessions: start, message, complete, get by date
- Dashboard: stats, compound streak

---

## Implementation Status

### ✅ Phase 1 Complete (Foundation)
- [x] Updated color scheme (deep navy, electric purple, cyan accents, red "10x")
- [x] Fluid determination slider with emoji indicators
- [x] Updated five core actions
- [x] Updated win/loss logic
- [x] Expanded Wormhole contact schema (all new fields)
- [x] Interaction logging with action_type and impact_rating

### 🔄 Phase 2: Signals & Points System (Next)
- [ ] Signal creation tied to 10x goal
- [ ] Point tracking & bonus system
- [ ] Planning ahead bonuses
- [ ] Before 6PM completion bonuses
- [ ] Signal streaks

### 📋 Phase 3: Expanded Wormhole CRM UI
- [ ] Full contact profile UI with all fields
- [ ] Action type selector in interaction logging
- [ ] Impact rating input

### 🔵 Phase 4: Community Features
- [ ] Member profiles with strategic connection fields
- [ ] Public signal feed
- [ ] Leaderboard
- [ ] Member directory

### 🔵 Phase 5: Deals CRM & Matching
- [ ] Deal tracking
- [ ] Needs categories
- [ ] Service matching

### 🔵 Phase 6: Messaging
- [ ] Direct messaging
- [ ] Group chats

---

## Future Enhancements
- Public streak sharing
- Social accountability groups
- Leaderboards
- Community challenges
- Premium tiers
- Coaching integrations
- Push notifications for daily reminders

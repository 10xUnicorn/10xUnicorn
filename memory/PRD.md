# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is a mobile-first execution operating system designed to turn ambitious individuals into consistent high-performers through daily clarity, bold execution, relationship leverage, AI-guided course correction, compounding behavior tracking, and momentum analytics.

## Tech Stack
- **Frontend**: Expo React Native (SDK 54) with expo-router (file-based routing)
- **Backend**: FastAPI (Python) with MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (emergentintegrations library)
- **Auth**: JWT-based email/password authentication

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
- **Determination Slider**: 0-10 with emoji progression (😴→😐→😤→🔥→🦄)
- **Intention**: "What kind of person are you being today?"
- **10x Focus**: Large prominent mission input with top action checkbox
- **Five Core Actions**: Top Action, Wormhole, Scariest Thing, Boldest Move, 7-Min Meditation
- **Wormhole Section**: Relationship leverage input
- **Daily Compound**: Habit checkbox with streak counter + optional notes
- **Distraction Reflection**: Notes + course-correct toggle
- **AI Course Correction**: Button to launch AI coaching session

### 4. Win Logic Engine
| Status | Condition |
|--------|-----------|
| `unicorn_win` | All 5 core actions complete |
| `priority_win` | Top priority completed |
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

### 6. Wormhole Contact System
- Manual contact creation (name, company, title, next step)
- Phone contact import (expo-contacts)
- Interaction logging with history
- Engagement score tracking
- Search/filter contacts

### 7. Momentum Dashboard
- Active 10x Goal display
- Compound streak (current + 7/30/90-day percentages)
- Win Performance (Win Rate, Unicorn Rate, Current/Longest Streak)
- Win breakdown (Unicorn Wins, Priority Wins, Course Corrected, Total)
- Core Action completion rates (bar chart)
- Determination trend (7-day)
- Wormhole Network metrics (top contacts by engagement)

### 8. Profile Management
- Edit display name, 10x goal, compound habit
- View timezone and member-since date
- Logout / Delete Account

## Data Models
- **users**: id, email, password_hash, onboarded, created_at
- **profiles**: user_id, display_name, timezone_str
- **goals**: id, user_id, title, description, start_date, end_date, active
- **compound_habits**: user_id, habit_title
- **daily_entries**: user_id, date (unique per user), all daily fields + status
- **wormhole_contacts**: id, user_id, name, connection_level, tags, interaction_history
- **ai_sessions**: id, user_id, date_reference, conversation_log, marked_complete

## API Routes (all prefixed with /api)
- Auth: register, login, me, change-password, account delete
- Onboarding: complete onboarding
- Profile: get/update profile, goal, habit
- Daily Entries: get/update by date, list, move
- Wormhole: CRUD contacts, log interaction, bulk import
- AI Sessions: start, message, complete, get by date
- Dashboard: stats, compound streak

## Design System
- **Theme**: Dark mode default (#050505 background)
- **Accent**: Electric purple (#7F00FF) with glow effects
- **Typography**: Large bold headers, clear hierarchy
- **Spacing**: 8pt grid system
- **Components**: Cards with subtle borders, purple checkboxes, emoji-rich interactions
- **Navigation**: Bottom tabs (Today, Momentum, Wormhole, Profile)

## Future Enhancements
- Public streak sharing
- Social accountability groups
- Leaderboards
- Community challenges
- Premium tiers
- Coaching integrations
- Push notifications for daily reminders

# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is an integrated goal execution dashboard, relationship intelligence system, and community performance platform for business owners.

## Tech Stack
- **Frontend:** Expo (React Native), TypeScript, Expo Router
- **Backend:** FastAPI, Python, MongoDB
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Push Notifications:** Expo Push Service
- **Cloud Storage:** Emergent Object Storage
- **Authentication:** JWT + Google OAuth (Emergent Auth)

## Navigation (Tab Order)
- **Daily** (⚡ flash) - Daily tracking, signals
- **Dashboard** (📊 bar-chart) - Stats, streaks, heatmap
- **Community** (🏆 trophy) - Leaderboard, Feed, Directory
- **CRM** (🌀 planet) - **Signals → Contacts → Deals**
- **Profile** (👤 person) - Settings, emoji, goals

## Implemented Features (March 4, 2026)

### Authentication
- [x] **Email/Password Login** - Standard JWT auth
- [x] **Google Sign-In** - Emergent-managed OAuth flow
- [x] **Password Reset** - Email-based reset with token
- [x] **Forgot Password Screen** - Step-by-step reset flow

### Today Screen
- [x] **Determination Slider** - Always visible with motivational quote
  - Fluid gradient (orange→red→purple), fire emoji thumb
  - **Updated Emoji Scale:**
    - 1=😴 (sleeping), 2=🐢 (turtle), 3=🚶 (walking), 4=🚲 (bicycle)
    - 5=😐 (neutral), 6=💪 (strong arm), 7=🐎 (horse)
    - 8=🔥 (fire), 9=💎 (diamond), 10=🦄 (unicorn)
  - Random motivational quote displayed always
  - No collapse behavior
- [x] **"Who are you being today? I am ____"** intention format
- [x] **Top 10x Action with Edit Modal**
  - Shows 🔥 fire when completed
  - **Pencil icon opens Edit Signal modal**
  - Edit name, description, notes, impact rating
  - **Mark as incomplete button** to uncomplete
- [x] **Compound Habit Counter**
  - Up/down caret buttons for quick +1/-1
  - Tap count to open full counter modal
  - Progress bar toward target
- [x] 10x Unicorn Checklist (5 items)

### Dashboard
- [x] **10x Goal Card** with Edit button
- [x] **Edit Goal Modal** - KeyboardAvoidingView enabled
  - Edit title, description, deadline, target number
- [x] Stats boxes: Current/Best Streak, Unicorn Days, Priority Wins
- [x] Last 7 Days performance chart
- [x] Determination Trend visualization
- [x] Activity Heatmap

### Signals System
- [x] **Signal Types:**
  - 10x Action Item (purple)
  - Revenue Generating Activity (green)
  - Wormhole Activity (blue)
- [x] Signal CRUD with signal_type, notes, impact_rating
- [x] Assign signals to deals
- [x] Signal complete/uncomplete

### CRM System
- [x] **Tab order: Signals, Contacts, Deals**
- [x] **New Signal button** shows signal type picker
- [x] Contact labels and connection levels
- [x] **Dynamic Contact Form** - Fields change based on label type
- [x] **Wormhole Contact Fields (when "Wormhole" label selected):**
  - Connection Level selector (Active/Professional, Warm/Local, Building, Mid-Aspirational, Close/Personal)
  - Tags with colors (Influencer, Speaker, Business Owner, Access, Mindset, Future Self, Community Partner, Motivation)
  - Activation Next Step
  - Last Contact Date & Set Meeting toggle
  - Preferred Platform (Text, Phone, Email, In-Person, IG DM, LinkedIn, Video Call)
  - Location & Power Leverage
  - Social Media (LinkedIn, Instagram, Twitter, Website, YouTube, TikTok)
  - Engagement Types buttons (DMs, Replies to Comments, Shares Posts, Collaborates on Posts)
  - Reciprocity Notes
- [x] **"Show Advanced Fields" toggle** for non-wormhole contacts

### Profile & Social
- [x] **Profile emoji picker** (16 options)
- [x] **First name field** for "Name + Emoji" display
- [x] **Social links are clickable:**
  - LinkedIn, Twitter, Instagram, YouTube → open URL
  - Phone → prompts Call or Message
  - Email → opens mail with subject "Connecting from the 10xUNICORN community"

### Push Notifications
- [x] Streak milestone notifications: 7, 14, 30, 60, 90, 180, 365 days

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google (Emergent OAuth)
- POST /api/auth/request-password-reset
- POST /api/auth/reset-password
- GET /api/auth/me

### Signals
- POST /api/signals (includes signal_type, notes)
- GET/PUT/DELETE /api/signals/{id}
- POST /api/signals/{id}/complete
- POST /api/signals/{id}/uncomplete

### Profile
- GET/PUT /api/profile (first_name, profile_emoji)

### Daily Entry
- GET/PUT /api/daily-entry/{date} (compound_count)

### Goals
- GET/PUT /api/goals/{id}

## Testing Status
- Backend: 100% passing
- Frontend: 77%+ passing
- Latest: /app/test_reports/iteration_12.json

## Implemented in Latest Session (March 5, 2026)
- [x] **Dynamic Determination Quotes** - Quotes change based on slider level (low/building/high/unicorn)
- [x] **Messages Back Button** - Added navigation header with back button
- [x] **Contact Import Picker** - Phone contact picker modal (mobile-only)
- [x] **Signal Date Fix** - Fixed filtering to handle both YYYY-MM-DD and MM/DD/YY formats
- [x] **Dynamic Contact Fields** - Different fields for each label:
  - Prospect: Potential Value, Interest Level, Next Step
  - Referral Partner: Referral History, Commission, Reciprocity Notes
  - Strategic Partner: Partnership Type, Mutual Value, Collaboration Step
  - Client: Contract Value, Engagement Status, Project History
  - Resource: Expertise Areas, Rate, Availability
  - Wormhole: All advanced fields (15+ fields)
- [x] **Profile Edit Goal** - Edit button with progress bar and deadline display
- [x] **Auto 10x Unicorn Win** - Status automatically updates to "10x Unicorn Win" when all 5 checklist items completed
- [x] **Auto Priority Win** - Status automatically updates to "Priority Win" when top 10x action completed
- [x] **Goal Progress Save Fix** - Profile page now correctly displays and updates goal progress via /goals/progress API

## Bug Fixes (March 11, 2026)
- [x] **Bug Fix: Wormhole Contact Focused Relationship** - Added contact picker to Today screen's Wormhole section. Users can now select a contact as their daily focused relationship, updating `wormhole_contact_id` on the daily entry
- [x] **Bug Fix: Signal Invalid Date** - Standardized all signal dates to YYYY-MM-DD format with `normalize_date_to_iso()` backend helper. Frontend now uses ISO format for signal creation. CRM signal display uses proper date formatting
- [x] **Bug Fix: Profile Photo Not Updating** - Fixed field name mismatch (`profile_photo_path` vs `profile_photo_url`). Added public `GET /api/photos/{user_id}` endpoint. Backend now stores both path and URL. Frontend constructs full URL for Image component
- [x] **Bug Fix: Dashboard Heatmap Cut Off** - Fixed day label/cell height alignment by matching gap and height values. Month labels now use flex spacing

## Features (March 11, 2026)
- [x] **Signal Due Date Editing** - Added CalendarPicker component to both Today and CRM signal modals. Users can now set and edit signal due dates via an interactive calendar
- [x] **Smart Default Date** - Calendar picker defaults to today if before 3 PM, tomorrow if after 3 PM via `getSmartDefaultDate()`
- [x] **Dashboard Heatmap Auto-Scroll** - Heatmap now auto-scrolls to most recent activity on load instead of showing oldest dates first

## Upcoming Tasks
- [ ] Daily Compound action targets
- [ ] Weekly progress summary on dashboard
- [ ] Wormhole Network priority contacts on dashboard
- [ ] Community Feed with posts, reactions, comments
- [ ] "8 Pillars" user roadmap/blueprint in profile
- [ ] Dynamic CRM fields for all contact types
- [ ] Technical debt: Refactor server.py into routers
- [ ] Technical debt: Decompose crm.tsx and today.tsx

## Browser Cache Note
**If changes don't appear, hard refresh:**
- Windows/Linux: Ctrl+Shift+R
- Mac: Cmd+Shift+R

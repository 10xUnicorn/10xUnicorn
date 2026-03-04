# 10x Unicorn - Product Requirements Document

## Product Overview
10x Unicorn is an integrated goal execution dashboard, relationship intelligence system, and community performance platform for business owners.

## Tech Stack
- **Frontend:** Expo (React Native), TypeScript, Expo Router
- **Backend:** FastAPI, Python, MongoDB
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Push Notifications:** Expo Push Service
- **Cloud Storage:** Emergent Object Storage

## Navigation (Tab Order)
- **Daily** (⚡ flash) - Daily tracking, signals
- **Dashboard** (📊 bar-chart) - Stats, streaks, heatmap
- **Community** (🏆 trophy) - Leaderboard, Feed, Directory
- **CRM** (🌀 planet) - **Signals → Contacts → Deals**
- **Profile** (👤 person) - Settings, emoji, goals

## Implemented Features (March 4, 2026)

### Today Screen
- [x] **Determination Slider** - Always visible with motivational quote
  - Fluid gradient (orange→red→purple), fire emoji thumb
  - Random motivational quote displayed always
  - No collapse behavior
- [x] **"Who are you being today? I am ____"** intention format
- [x] **Glowing Complete Button** for Top 10x Action
  - Shows 🔥 fire when completed
  - Edit button to signal details
- [x] **Compound Habit Counter**
  - Up/down caret buttons for quick +1/-1
  - Tap count to open full counter modal
  - Progress bar toward target
- [x] 10x Unicorn Checklist (5 items)

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
- [x] Wormhole-specific fields for wormhole contacts

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

### Signals
- POST /api/signals (includes signal_type, notes)
- GET/PUT/DELETE /api/signals/{id}
- POST /api/signals/{id}/complete
- POST /api/signals/{id}/uncomplete

### Profile
- GET/PUT /api/profile (first_name, profile_emoji)

### Daily Entry
- GET/PUT /api/daily-entry/{date} (compound_count)

## Testing Status
- Backend: 95%+ passing
- Frontend: 100% passing
- Latest: /app/test_reports/iteration_8.json

## Browser Cache Note
**If changes don't appear, hard refresh:**
- Windows/Linux: Ctrl+Shift+R
- Mac: Cmd+Shift+R

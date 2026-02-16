# SpoilerFreeChat

## Project Overview

**SpoilerFreeChat** is a web application that enables spoiler-free live sports conversations. When watching live sports via TV or streaming, broadcast delays vary between viewers. This app synchronizes chat messages based on each user's current game time, ensuring no one receives spoilers from viewers who are ahead in the broadcast.

## The Problem

Two friends are watching the same basketball game. One is on cable TV (minimal delay), the other is on a streaming service (30+ seconds behind). If they text each other, the cable viewer will spoil plays for the streaming viewer. SpoilerFreeChat solves this by intelligently delaying message delivery.

## How It Works

1. **Join a Room** - Users join a chat room for a specific game
2. **Sync Game Time** - Each user inputs their current game clock (e.g., "8:42 left in Q3")
3. **Calculate Offset** - The system determines each user's delay relative to the "live" viewer
4. **Queue Messages** - Incoming messages are held per-user based on their offset
5. **Timed Release** - Messages appear only when the recipient has "caught up" to that moment in the game
6. **Zero Delay for Live Viewers** - The user furthest ahead receives messages instantly

## User Context

- **Developer experience**: Learning programmer, not expert level
- **Explanation needs**: All technical decisions require clear, beginner-friendly explanations
- **Code philosophy**: Prioritize understandability over cleverness
- **Learning goals**: Fully understand each decision made during development

## Technical Requirements

### Must Have
- Web application (mobile is a future goal)
- Clean, modern, maintainable code
- Security is paramount
- No hardcoded temporary values
- Real-time messaging capability

### Preferences
- Widely used, well-documented frameworks
- Easy local development setup
- Cheap/free deployment options
- Avoid over-complex DevOps early on

## Development Workflow

### Testing
- Include basic automated tests where practical
- Focus on simple, meaningful tests over exhaustive coverage
- Use standard tools for the chosen stack
- Provide clear instructions for running tests locally
- No complex CI/CD early on

### Git & GitHub
- Project lives in a GitHub repository
- Commits represent logical, working checkpoints
- Each commit should be a functioning state
- Short, clear commit messages
- Avoid unnecessary micro-commits
- Document major changes with explanations

### Documentation
- Keep this Claude.md file updated throughout development
- Simple, copy/paste-able setup instructions
- Update docs when project structure changes

## Current State

- **Phase**: Security Hardening (2026-02-15) ✅
- **Tech stack**: React + Vite + Tailwind + Shadcn/UI (frontend), Node.js + Express + Socket.IO + Prisma (backend)
- **Database**: Supabase PostgreSQL for persistence
- **Authentication**: Google OAuth via Supabase Auth (optional - guests still supported)
- **Core feature working**: Messages are delayed based on user offsets!
- **Multi-sport support**: Basketball, Football, Hockey, and Soccer with sport-specific timing
- **Persistence**: Messages and sessions survive server restarts
- **Reconnection**: Users can refresh the page and resume their session with game time restored
- **User preferences**: Authenticated users can save nickname, theme, notification settings
- **Recent rooms**: Quick rejoin feature with sport type display
- **UI**: Vibrant teal/cyan theme with proper light/dark mode support
- **Navigation**: Home button, Create vs Join room flows, shareable room codes
- **Security**: Rate limiting (connections, messages, join attempts), input validation, XSS prevention, JWT verification, request body limits, room membership validation
- **Live URLs**:
  - Frontend: https://spoiler-free-chat.vercel.app
  - Backend: https://fresh-charin-brandonorg-fb132fcb.koyeb.app

## ✅ Security Hardening: Pre-Launch Audit - 2026-02-15

**Goal:** Comprehensive security audit and hardening before v1 public launch.

**Security Audit Findings:** The app already had good security fundamentals (JWT verification, input validation, XSS prevention, rate limiting, RLS). The audit identified 3 medium-severity defense-in-depth improvements.

**What Was Done:**

### Request Body Size Limits
- Added `limit: '10kb'` to `express.json()` middleware (prevents memory exhaustion DoS)
- Added `maxHttpBufferSize: 1e5` (100KB) to Socket.IO configuration

### Room Code Brute Force Protection
- Added `checkJoinRateLimit()` function to rate limiter service
- Limits join attempts to 10 per minute per IP address
- Prevents room code enumeration attacks
- Applied to `join-room` socket event handler

### Socket Event Room Membership Validation
- Added `validateRoomMembership()` helper function
- Verifies socket is actually in the room manager before processing events
- Applied to `sync-game-time` and `send-message` handlers
- Prevents event spoofing if room state gets out of sync

### Dependency Vulnerability Fix
- Ran `npm audit fix` to resolve low-severity `qs` package vulnerability
- Now shows 0 vulnerabilities

**Files Modified:**
- `backend/server.js` - Body limits, Socket.IO limits, join rate limiting, membership validation
- `backend/services/rateLimiter.js` - Added `checkJoinRateLimit()` and `clearJoinAttempts()`
- `backend/package-lock.json` - Updated qs dependency

**Security Audit Summary:**
- **Authentication**: Strong (JWT via JWKS, proper issuer/audience validation)
- **Input Validation**: Strong (whitelist patterns, HTML escaping, profanity filter)
- **XSS Prevention**: Strong (no dangerouslySetInnerHTML, React auto-escaping)
- **Rate Limiting**: Now comprehensive (connections, messages, AND join attempts)
- **Database**: Strong (RLS enabled, Prisma parameterized queries)
- **Headers**: Adequate (Helmet defaults enabled)

---

## ✅ UI Polish: Pre-Launch Improvements - 2026-02-15

**Goal:** Polish the UI before official v1 launch.

**What Was Done:**

### Homepage Updates
- Updated tagline from "Watch Together, Stay Safe" to "Talk Sports, Spoiler Free"
- Redesigned feature cards section:
  - Larger icons (w-20/h-20 containers, h-10/w-10 icons)
  - Larger title text (text-lg)
  - Translucent container with backdrop blur effect
  - Removed individual card borders for cleaner look

### ChatRoom Improvements
- Added room code display with copy-to-clipboard button in sidebar
- Compacted sidebar spacing for better mobile fit:
  - Reduced sidebar width from w-72 to w-64
  - Tightened padding throughout (p-4 → p-3)
  - More compact TimeSync and "In This Room" cards

**Files Modified:**
- `frontend/src/components/HomePage.jsx` - Tagline, feature cards redesign
- `frontend/src/components/ChatRoom.jsx` - Room code display, sidebar spacing
- `frontend/src/components/TimeSync.jsx` - Compact card styling

---

## ✅ Sync Improvement: Late Joiner Protection & User Education - 2026-02-14

**Goal:** Solidify the core sync logic to reduce spoiler leaks and help users understand the system.

**Problem Addressed:**
- Late joiners received messages immediately (guaranteed spoilers)
- Users didn't understand WHY or WHEN to sync
- No visibility into when other users last synced
- Mobile sync was hard to discover

**What Was Done:**

### Phase 1: Late Joiner Protection (Backend)
- Added `getMaxRoomOffset()` helper to `roomManager.js`
- Changed `server.js` message delivery: unsynced users now receive NEW messages with the room's maximum offset as a conservative delay
- Message history is NOT sent to new users on join - they see "No messages yet" until they sync
- When user syncs for the first time, they receive message history via `message-history` event
- **Impact:** Late joiners no longer see any spoilers before syncing

### Phase 2: Pre-Sync Education (Frontend)
- Added educational modal in `SyncModal.jsx` before first sync
- Explains broadcast delays and the 3-step process
- Includes tip about coordinating sync timing with friends

### Phase 3: Improved Offset Display (Frontend)
- Updated `TimeSync.jsx` to explain offset meaning
- Baseline users see: "You're the fastest viewer - messages arrive instantly."
- Delayed users see: "Messages will be held for X seconds so you don't get spoiled."

### Phase 4: Sync Timestamp Visibility (Full Stack)
- Added `syncedAt` timestamp tracking in `roomManager.js`
- User list in `ChatRoom.jsx` now shows "synced just now", "synced 2m ago", etc.
- Fixed bug where user's OWN sync status showed "Not synced" after syncing (now updates own entry in users list via `updateUserSync` in `useSocket.js`)
- Creates social visibility around sync freshness

### Phase 5: Mobile Sync FAB (Frontend)
- Added floating "Sync Now" button for unsynced mobile users in `ChatRoom.jsx`
- More prominent than previous "tap menu to sync" hint

**Files Modified:**
- `backend/server.js` - Late joiner message queueing, message history on first sync
- `backend/services/roomManager.js` - `getMaxRoomOffset()`, `syncedAt` tracking
- `frontend/src/components/SyncModal.jsx` - Education modal
- `frontend/src/components/TimeSync.jsx` - Offset explanation
- `frontend/src/components/ChatRoom.jsx` - Sync timestamps, mobile FAB, relative time updates
- `frontend/src/hooks/useSocket.js` - Handle `message-history` event, update own sync status

**Testing Completed:**
- Late joiner scenario: 3rd user joins, sees no messages, syncs, then receives history
- Education modal appears before first sync
- Offset explanation displays correctly after syncing
- User's own sync status updates in "In This Room" list
- Sync timestamps show "synced just now", "synced Xm ago", etc.
- Mobile FAB visible for unsynced users (verified via browser resize)

**Future Enhancements (Not Yet Implemented):**
- Countdown sync ("Sync in 3, 2, 1...") for coordinated group sync
- Drift detection to auto-prompt resyncs when accuracy degrades
- Game clock API integration (expensive, for later scale)

---

## ✅ Bug Fix: Rate Limiter TypeError - 2026-02-14

**Issue:** Sentry reported `TypeError: response.status is not a function` in `express-rate-limit` when the connection rate limit was exceeded.

**Root Cause:** The `express-rate-limit` middleware was applied to Socket.IO's engine layer via `io.engine.use()`. When the rate limit triggered, the default handler called `response.status()`, but Socket.IO's engine passes raw Node.js `ServerResponse` objects which don't have the `.status()` method (that's Express-specific).

**Fix Applied:**
- Added a custom `handler` option to the rate limiter configuration
- Handler uses `res.writeHead(429, ...)` and `res.end()` instead of Express methods
- Rate limiting still works correctly, now with proper Node.js compatibility

**File Modified:** `backend/server.js` (lines 83-92)

---

## ✅ Security Fix: Row Level Security (RLS) - 2026-02-12

**Issue:** Supabase flagged all database tables as security vulnerabilities because Row Level Security was disabled. Without RLS, tables are exposed through the PostgREST API.

**Analysis:** The app architecture was already secure in practice - the frontend only uses Supabase for authentication, and all data access goes through the backend via Prisma. However, RLS should still be enabled as defense-in-depth.

**Fix Applied:**
- Created Prisma migration to enable RLS on all 6 tables
- Added "Deny all access via PostgREST" policies for `anon` and `authenticated` roles
- Backend continues to work because Prisma uses the `postgres` role which bypasses RLS

**Tables Protected:**
- `User`, `Session`, `Room`, `Message`, `RecentRoom`, `_prisma_migrations`

**Migration File:** `backend/prisma/migrations/20260212000000_enable_rls/migration.sql`

---

## ✅ V1 Shipping Prep - 2026-02-07

**Goal:** Complete the remaining Shippable v1 Checklist items to prepare for real users.

**What Was Done:**

### Legal Documents
- Created Privacy Policy page (`/privacy` route)
- Created Terms of Service page (`/terms` route)
- Added footer links to HomePage
- Added `vercel.json` for client-side routing

### Error Tracking (Sentry)
- Integrated Sentry for frontend (React ErrorBoundary)
- Integrated Sentry for backend (Express error handler)
- Added environment variables: `VITE_SENTRY_DSN` (Vercel), `SENTRY_DSN` (Koyeb)
- Frontend Sentry tested and working in production

### Mobile Responsiveness
- Made ChatRoom sidebar collapsible (hidden on mobile with toggle button)
- Added mobile sidebar overlay with proper transitions
- Updated ChatRoom header for mobile (condensed elements)
- Made HomePage join form responsive (stacks vertically on mobile)
- Made TimeSync inputs responsive (flex instead of fixed widths)
- Added mobile-specific UI hints (e.g., "tap menu to sync")

### Structured Logging
- Installed pino for JSON logging
- Created `backend/services/logger.js`
- Replaced all `console.log/error` with structured logger calls
- Logs now include structured data (roomId, nickname, etc.)

### Monitoring & Analytics
- UptimeRobot can be set up to monitor health endpoints
- Vercel Analytics available (just enable in dashboard)

### Documentation
- Created `docs/OPERATIONS.md` operational playbook

**Key Files Added:**
- `frontend/src/pages/PrivacyPolicy.jsx` - Privacy policy page
- `frontend/src/pages/TermsOfService.jsx` - Terms of service page
- `frontend/vercel.json` - Vercel routing config
- `backend/services/logger.js` - Structured logging
- `docs/OPERATIONS.md` - Operations playbook

**Key Files Modified:**
- `frontend/src/App.jsx` - Added routing for legal pages, Sentry
- `frontend/src/main.jsx` - Sentry initialization
- `frontend/src/components/HomePage.jsx` - Footer, responsive form
- `frontend/src/components/ChatRoom.jsx` - Mobile responsive sidebar
- `frontend/src/components/TimeSync.jsx` - Responsive inputs
- `backend/server.js` - Sentry, structured logging
- `backend/services/*.js` - Structured logging throughout

### Remaining Manual Steps

**Already Completed:**
- [x] Sentry frontend project created and DSN added to Vercel
- [x] Legal pages deployed and accessible

**Also Completed (2026-02-12):**
- [x] Backend Sentry - `SENTRY_DSN` added to Koyeb
- [x] UptimeRobot - Monitors set up for backend health and frontend
- [x] Vercel Analytics - Enabled in dashboard

**Still To Do:**
1. **Google OAuth Verification** - Submit after finalizing domain/branding (see below)

---

## 📋 Domain & Branding Change Checklist

When you're ready to finalize your app name and custom domain, here's everything that needs to be updated:

### 1. Domain Configuration

**Vercel (Frontend):**
- Add custom domain in Vercel Dashboard → Settings → Domains
- Update any hardcoded URLs in code (search for `spoiler-free-chat.vercel.app`)

**Supabase:**
- Go to Authentication → URL Configuration
- Update Site URL to new domain
- Update Redirect URLs to include new domain

**Google Cloud Console:**
- Go to APIs & Services → Credentials → OAuth 2.0 Client
- Add new domain to Authorized JavaScript origins
- Add new domain to Authorized redirect URIs

**Koyeb:**
- Update `CORS_ORIGIN` environment variable to include new frontend domain

### 2. Backend URL (If Changing)

If you get a custom domain for the backend:
- Update `VITE_SOCKET_URL` in Vercel environment variables
- Update UptimeRobot monitors

### 3. Branding/App Name

**Code Updates:**
- `frontend/src/pages/PrivacyPolicy.jsx` - App name references
- `frontend/src/pages/TermsOfService.jsx` - App name references
- `frontend/src/components/HomePage.jsx` - Hero section text
- `frontend/index.html` - Page title

**External Services:**
- Google Cloud Console → OAuth consent screen → App name
- Sentry project names (optional, cosmetic)
- UptimeRobot monitor names (optional, cosmetic)

### 4. Google OAuth Verification

**Prerequisites:**
- Final domain configured
- Privacy policy accessible at new domain
- Terms of service accessible at new domain
- App logo (120x120 pixels)

**Steps:**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Add Privacy Policy URL
3. Add Terms of Service URL
4. Upload app logo
5. Click "Prepare for verification"
6. Submit for review (takes 2-4 weeks)

**Note:** The app works without verification - users just see an "unverified app" warning during Google sign-in

---

## ✅ Phase 10 Complete (Landing Page Redesign) - 2026-02-04

**Goal:** Improve navigation and room creation flows to make the app feel more professional.

**Post-Phase Polish (2026-02-06):**
- Enlarged and centered feature card icons on homepage (w-12→w-16, h-6→h-8)

**What Was Done:**
- New HomePage with hero section, feature cards, and professional landing experience
- CreateRoomModal with room metadata (room name, teams, game date)
- Auto-generated shareable room codes (e.g., "GAME-X7K2")
- Copy-to-clipboard functionality for room codes
- Join by code form on homepage
- Home button in ChatRoom header (returns to homepage without leaving room)
- "Return to Room" notice when viewing home while still connected
- Recent rooms display with room metadata
- Loading spinner component
- Database schema updated with room metadata fields (roomName, teams, gameDate)
- Created baseline migration for all Phase 7, 8, 11 schema changes
- Fixed Prisma migration drift with proper baselining approach

**Key Files Added:**
- `frontend/src/components/HomePage.jsx` - New landing page with hero section
- `frontend/src/components/CreateRoomModal.jsx` - Room creation modal with metadata
- `backend/prisma/migrations/20260204000000_baseline_phase_7_8_11/` - Baseline migration

**Deployed:** 2026-02-04 - All features tested and working in production

---

## ✅ Phase 9 Complete (UI Polish & Theming) - 2026-02-02

**Design Direction:**
- Bold & Vibrant style (inspired by Discord, Vercel, Supabase)
- Teal/Cyan accent color
- Dark mode uses comfortable dark gray (#1a1a1a), not near-black
- Theme toggle available in Preferences (signed-in users only)

**What Was Done:**
- Updated CSS variables in `index.css` with teal accent color using OKLch color space
- Refactored all 11 Shadcn UI components to use semantic classes (`bg-primary`, `text-foreground`, etc.)
- Updated all custom components (App, JoinRoom, ChatRoom, TimeSync) to use theme variables
- Message bubbles: own messages are teal, others are muted gray
- All focus rings and interactive elements use teal accent
- Backend now supports comma-separated CORS origins for flexible local dev

**Files Modified:**
- `frontend/src/index.css` - CSS variable definitions (foundation)
- `frontend/src/components/ui/*.jsx` - All Shadcn components (button, badge, card, input, select, dialog, alert, separator, scroll-area)
- `frontend/src/App.jsx` - Background color
- `frontend/src/components/ChatRoom.jsx` - Header, sidebar, message bubbles
- `frontend/src/components/JoinRoom.jsx` - Background and muted text
- `frontend/src/components/TimeSync.jsx` - Muted text
- `backend/server.js` - CORS parsing for comma-separated origins

**Future Theme Flexibility:**
To change the accent color, update these CSS variables in `index.css`:
- `--primary`, `--accent`, `--ring` (in both `:root` and `.dark`)
- The hue value in OKLch controls the color: 195=Teal, 270=Purple, 220=Blue, 30=Orange

**Testing Status:**
- [x] Dark mode displays correctly (teal accents on dark gray background)
- [x] Light mode displays correctly (teal accents on white background)
- [x] Buttons are teal with proper hover states
- [x] Message bubbles differentiate own vs others
- [x] Theme toggle works in Preferences modal
- [ ] Full end-to-end testing with multiple users (pending)

---

## ✅ Phase 7 & 8 Testing Complete (2026-02-02)

**Session 2026-02-02 Fixes Applied:**
- Fixed auto-reconnect on page refresh (was storing session but not using it)
- Fixed flash of JoinRoom screen during reconnect (shows "Reconnecting..." instead)
- Added AuthButton to ChatRoom header (sign out now accessible from room)
- Added sport emoji indicator to room header
- Fixed CORS to allow PATCH method (preferences weren't saving)
- Added SUPABASE_URL to Koyeb environment (JWT verification was failing)
- Fixed socket auth timing (socket reconnects when user signs in so token is sent)
- Made sign out button more visible with text label

**All Phase 7 & 8 Features Verified Working:**
- [x] Google OAuth sign in/out
- [x] Preferences save and persist (nickname, theme, notifications)
- [x] Recent rooms list shows after joining rooms
- [x] Quick rejoin from recent rooms
- [x] Page refresh keeps you in room (auto-reconnect)
- [x] Sport selection and inheritance (first joiner sets sport)
- [x] Sport emoji in room header
- [x] All sport timing formats work correctly
- [x] Message delays work across all sports
- [x] Reconnection restores sport type and sync state
- [x] Recent rooms show sport emoji

**Not Yet Tested (Optional):**
- [ ] Magic Link email delivery and sign-in flow

## Decisions Made

| Question | Decision |
|----------|----------|
| Tech stack | React + Vite + Node.js + Express + Socket.IO + Prisma |
| Database | Supabase PostgreSQL (added in Phase 6) |
| Authentication | Google OAuth via Supabase Auth (optional, guests supported) |
| Deployment | Koyeb (backend) + Vercel (frontend) |
| Sports support | Basketball, Football, Hockey, Soccer (Phase 8) |
| UI Theme | Teal/Cyan accent, dark gray dark mode, semantic CSS variables (Phase 9) |
| Theme access | Signed-in users only (stored in preferences) |

## Project Structure

```
SpoilerFreeChat/
├── CLAUDE.md              # This file - project documentation
├── Plan.md                # Detailed implementation plan
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── jsconfig.json      # Path aliases for @ imports
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css         # Tailwind + Shadcn theme
│       ├── components/
│       │   ├── ChatRoom.jsx
│       │   ├── TimeSync.jsx
│       │   ├── JoinRoom.jsx        # Create/Join room flows (Phase 10)
│       │   ├── Header.jsx          # Navigation header (Phase 10)
│       │   ├── SyncModal.jsx
│       │   ├── AuthButton.jsx      # Sign in/out button
│       │   ├── AuthModal.jsx       # OAuth sign-in modal
│       │   ├── PreferencesModal.jsx # User preferences
│       │   └── ui/           # Shadcn/UI components
│       │       ├── button.jsx
│       │       ├── input.jsx
│       │       ├── card.jsx
│       │       ├── dialog.jsx
│       │       ├── select.jsx
│       │       ├── badge.jsx
│       │       ├── alert.jsx
│       │       ├── label.jsx
│       │       ├── separator.jsx
│       │       ├── scroll-area.jsx
│       │       ├── switch.jsx
│       │       └── spinner.jsx     # Loading spinner (Phase 10)
│       ├── hooks/
│       │   └── useSocket.js
│       ├── lib/
│       │   ├── utils.js      # Shadcn utility functions
│       │   ├── supabase.js   # Supabase client
│       │   └── sportConfig.js # Sport configurations (Phase 8)
│       └── store/
│           ├── chatStore.js
│           └── authStore.js  # Authentication state
└── backend/
    ├── package.json
    ├── server.js
    ├── .env
    ├── prisma/
    │   ├── schema.prisma     # Database schema
    │   └── migrations/       # Database migrations
    └── services/
        ├── roomManager.js    # Room/user state management (hybrid in-memory + DB)
        ├── messageQueue.js   # Delay logic
        ├── timeUtils.js      # Offset calculations (multi-sport in Phase 8)
        ├── sportConfig.js    # Sport configurations (Phase 8)
        ├── rateLimiter.js    # Message rate limiting
        ├── validation.js     # Input validation (multi-sport in Phase 8)
        ├── database.js       # Prisma client singleton
        ├── sessionManager.js # Session persistence for reconnection
        ├── authService.js    # JWT token verification
        └── userService.js    # User preferences and recent rooms
```

## Setup Instructions

### Prerequisites
- Node.js 20+

### Backend
```bash
cd backend
npm install
cp .env.example .env  # If .env doesn't exist
npm run dev           # Runs on http://localhost:3001
```

### Frontend (separate terminal)
```bash
cd frontend
npm install
npm run dev           # Runs on http://localhost:5173
```

## Running Tests

Manual testing with multiple browser tabs:
1. Open 3 tabs to http://localhost:5173
2. Join same room with different nicknames
3. Select a sport (basketball, football, hockey, or soccer)
4. Sync different game times based on the sport:
   - Basketball: Q1 12:00, Q1 11:45, Q1 11:30
   - Football: Q1 15:00, Q1 14:30, Q1 14:00
   - Hockey: P1 20:00, P1 19:30, P1 19:00
   - Soccer: 1st Half 0:00, 1st Half 0:30, 1st Half 1:00 (counts up)
5. Send messages and verify delays match offsets
6. Verify second joiner gets room's sport type (not their selection)

## Future Ideas (Phase 11+)

### UI Polish
- Subtle gradients on buttons or headers
- More refined shadows and depth
- Animated transitions between states
- Mobile responsiveness improvements (high priority for real users)

### Feature Ideas
- Multiple theme options (not just light/dark, but different accent colors)
- Sound notifications for new messages
- Typing indicators
- Read receipts
- Message reactions/emoji
- Custom room codes (let creators choose their own code)

### Sync Flow Improvements (Revisit)
- **Better sync coordination** - Current flow requires users to manually input their game time. Consider improvements:
  - Countdown timer ("Sync in 3, 2, 1...") so all users sync at the same moment
  - "Ready" button system where room creator triggers sync for everyone
  - Visual indicator showing when other users last synced
  - Re-sync reminders if someone's been synced for a long time (drift correction)
  - Guided onboarding explaining the importance of syncing at the same real-world moment

## Other Future Polish

- **Google OAuth Verification**: Submit app to Google for verification to remove the "unverified app" warning during sign-in. Requires privacy policy and terms of service.

## UX Improvements (Identified 2026-02-01)

**Status: Most items addressed in Phase 10!**

### Navigation & Multi-Room Support
- [x] **Home/Back button**: Added Home button in ChatRoom header - returns to homepage without leaving room
- [ ] **Room switcher**: Consider supporting multiple active rooms or at least easier room switching
- [ ] **Breadcrumb navigation**: Show current location (e.g., "Home > Room: Lakers-Game")

### Room Creation vs Joining
- [x] **Separate flows**: HomePage now has "Create Game Room" button and "Join by code" form
- [x] **Auto-generated room codes**: Room codes like "GAME-X7K2" are auto-generated with copy button
- [ ] **Custom room codes**: Let creators choose their own code if they prefer
- [ ] **Room discovery**: Consider if rooms should be listed/searchable (privacy implications)

### Sign-In Benefits Clarity
- [x] **Onboarding**: HomePage shows benefits of signing in for guests
- [x] **Guest limitations**: Clear messaging about what guests can/can't do
- [ ] **Preferences visibility**: Make the gear/settings button more discoverable

### General UX
- [x] **Empty state for Recent Rooms**: Shows helpful message for signed-in users with no room history
- [x] **Room persistence indicator**: "Return to Room" notice when viewing home while connected
- [x] **Loading states**: Spinner component with "Reconnecting..." feedback

---

## 🚀 Shippable v1 Checklist (For Future Reference)

Before considering the app "shippable" for real users, address these items:

### Critical (Must Fix)
- [x] **Prisma/Supabase connection stability** - Fixed with pgbouncer flag and retry logic
- [x] **Reconnection robustness** - Added 10-second timeout with fallback to JoinRoom
- [x] **Better error handling** - Added retry logic for transient database errors
- [x] **Database RLS security** - Enabled Row Level Security on all tables (2026-02-12)

### Important (Should Fix)
- [x] **Mobile responsiveness** - Collapsible sidebar, responsive forms, mobile-friendly layout
- [ ] **Google OAuth verification** - Remove "unverified app" warning (requires privacy policy + terms) - Submit to Google after deploying legal pages

### Operational (Need for Running a Business)
- [x] **Error tracking** - Sentry integration for frontend and backend
- [x] **Monitoring** - UptimeRobot configured for backend health and frontend
- [x] **Logging** - Structured JSON logging with pino
- [x] **Operational playbook** - Created docs/OPERATIONS.md
- [x] **Analytics** - Vercel Analytics enabled

### Legal (Required for OAuth/Business)
- [x] **Privacy Policy** - Created at /privacy route
- [x] **Terms of Service** - Created at /terms route

---

## ✅ Fixed: Prisma/Supabase Connection Issues (2026-02-03)

**Issue 1**: "prepared statement does not exist" errors
**Fix**: Added `?pgbouncer=true` to DATABASE_URL to disable prepared statements

**Issue 2**: "Error in PostgreSQL connection: Closed" errors
**Fix**: Added connection pool settings and retry logic with exponential backoff

**Files Changed**:
- `backend/.env` - Added `?pgbouncer=true&connection_limit=1&pool_timeout=20`
- `backend/.env.example` - Updated with correct format and documentation
- `backend/services/database.js` - Added `withRetry()` helper for transient errors
- `backend/services/sessionManager.js` - Wrapped cleanup operations with retry logic

**IMPORTANT for Production (Koyeb)**:
Update the DATABASE_URL environment variable to include pool settings:
```
postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
```

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

- **Phase**: Phase 9 Complete (UI Polish & Theming) 🎨
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
- **Security**: Rate limiting, input validation, XSS prevention, JWT verification
- **Live URLs**:
  - Frontend: https://spoiler-free-chat.vercel.app
  - Backend: https://fresh-charin-brandonorg-fb132fcb.koyeb.app
- **Next**: Phase 10 (TBD - see UX Improvements section for ideas)

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
│       │   ├── JoinRoom.jsx
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
│       │       └── switch.jsx
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

## Future: Phase 10+ Ideas

### Additional UI Polish
- Subtle gradients on buttons or headers
- More refined shadows and depth
- Animated transitions between states
- Mobile responsiveness improvements

### Feature Ideas
- Multiple theme options (not just light/dark, but different accent colors)
- Sound notifications for new messages
- Typing indicators
- Read receipts
- Message reactions/emoji

## Other Future Polish

- **Google OAuth Verification**: Submit app to Google for verification to remove the "unverified app" warning during sign-in. Requires privacy policy and terms of service.

## UX Improvements (Identified 2026-02-01)

These improvements were identified during Phase 7/8 testing and should be addressed in a future session:

### Navigation & Multi-Room Support
- **Home/Back button**: Add a way to return to the main screen without "Leave Room" (which clears session)
- **Room switcher**: Consider supporting multiple active rooms or at least easier room switching
- **Breadcrumb navigation**: Show current location (e.g., "Home > Room: Lakers-Game")

### Room Creation vs Joining
- **Separate flows**: Distinguish between "Create New Room" and "Join Existing Room"
- **Auto-generated room codes**: When creating, auto-generate a shareable code (e.g., "LAKERS-X7K2")
- **Custom room codes**: Let creators choose their own code if they prefer
- **Room discovery**: Consider if rooms should be listed/searchable (privacy implications)

### Sign-In Benefits Clarity
- **Onboarding**: Explain what signing in provides (saved preferences, recent rooms, etc.)
- **Guest limitations**: Make clear what guests can't do (no saved preferences, no room history)
- **Preferences visibility**: Make the gear/settings button more discoverable

### General UX
- **Empty state for Recent Rooms**: Show "Join rooms to see them here" for signed-in users with no history
- **Room persistence indicator**: Show users they're reconnected vs starting fresh
- **Loading states**: Better feedback during reconnection attempts

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

- **Phase**: Phase 8 Complete (Multi-Sport Support) 🚀
- **Tech stack**: React + Vite + Tailwind + Shadcn/UI (frontend), Node.js + Express + Socket.IO + Prisma (backend)
- **Database**: Supabase PostgreSQL for persistence
- **Authentication**: Google OAuth via Supabase Auth (optional - guests still supported)
- **Core feature working**: Messages are delayed based on user offsets!
- **Multi-sport support**: Basketball, Football, Hockey, and Soccer with sport-specific timing
- **Persistence**: Messages and sessions survive server restarts
- **Reconnection**: Users can refresh the page and resume their session with game time restored
- **User preferences**: Authenticated users can save nickname, theme, notification settings
- **Recent rooms**: Quick rejoin feature with sport type display
- **UI**: Fully styled with Shadcn/UI components
- **Security**: Rate limiting, input validation, XSS prevention, JWT verification
- **Live URLs**:
  - Frontend: https://spoiler-free-chat.vercel.app
  - Backend: https://fresh-charin-brandonorg-fb132fcb.koyeb.app
- **Next**: Phase 9 (UI Polish & Theming)

## ⚠️ NEXT SESSION: Testing Required

**Priority for next session:** Before moving to Phase 9, we need to thoroughly test:

### Phase 7 (Authentication) - Not fully tested
- [ ] Google OAuth sign-in flow (click sign in, complete OAuth, verify session)
- [ ] Sign out functionality
- [ ] Preferred nickname saves and loads correctly
- [ ] Theme preference persists
- [ ] Notification sound preference persists
- [ ] Recent rooms list populates after joining rooms
- [ ] Quick rejoin from recent rooms works
- [ ] Guest users still work without signing in
- [ ] JWT token verification on backend

### Phase 8 (Multi-Sport Support) - Not tested yet
- [ ] Sport selector UI displays all 4 sports with emojis
- [ ] First joiner sets room's sport type
- [ ] Second joiner inherits room's sport (not their selection)
- [ ] Basketball: 4 quarters, 12-minute clock countdown
- [ ] Football: 4 quarters, 15-minute clock countdown
- [ ] Hockey: 3 periods, 20-minute clock countdown
- [ ] Soccer: 2 halves, clock counts UP (stoppage time support)
- [ ] TimeSync component shows correct period labels per sport
- [ ] Message delays work correctly across all sports
- [ ] Recent rooms show sport emoji
- [ ] Reconnection restores sport type and sync state

## Decisions Made

| Question | Decision |
|----------|----------|
| Tech stack | React + Vite + Node.js + Express + Socket.IO + Prisma |
| Database | Supabase PostgreSQL (added in Phase 6) |
| Authentication | Google OAuth via Supabase Auth (optional, guests supported) |
| Deployment | Koyeb (backend) + Vercel (frontend) |
| Sports support | Basketball, Football, Hockey, Soccer (Phase 8) |

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

## Future: Phase 9 (UI Polish & Theming)

- Custom accent colors beyond grayscale
- Color scheme variations (blue, purple, etc.)
- Refactor hardcoded `bg-zinc-*` classes to semantic theme variables
- Visual refinements (gradients, shadows, polish)
- Consistent styling across all components

## Other Future Polish

- **Google OAuth Verification**: Submit app to Google for verification to remove the "unverified app" warning during sign-in. Requires privacy policy and terms of service.

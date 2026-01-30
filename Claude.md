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

- **Phase**: Phase 4 Complete (Polish & Edge Cases)
- **Tech stack**: React + Vite + Tailwind + Shadcn/UI (frontend), Node.js + Express + Socket.IO (backend)
- **Core feature working**: Messages are delayed based on user offsets!
- **UI**: Fully styled with Shadcn/UI components
- **Security**: Rate limiting, input validation, XSS prevention
- **Next**: Phase 5 (Deployment)

## Decisions Made

| Question | Decision |
|----------|----------|
| Tech stack | React + Vite + Node.js + Express + Socket.IO |
| Database | Skip for MVP, in-memory storage |
| Authentication | Anonymous + nicknames for MVP |
| Deployment | Koyeb (backend) + Vercel (frontend) - planned |
| Sports support | Basketball only for MVP |

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
│       │       └── scroll-area.jsx
│       ├── hooks/
│       │   └── useSocket.js
│       ├── lib/
│       │   └── utils.js      # Shadcn utility functions
│       └── store/
│           └── chatStore.js
└── backend/
    ├── package.json
    ├── server.js
    ├── .env
    └── services/
        ├── roomManager.js    # Room/user state management
        ├── messageQueue.js   # Delay logic
        ├── timeUtils.js      # Offset calculations
        ├── rateLimiter.js    # Message rate limiting
        └── validation.js     # Input validation
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
3. Sync different game times (e.g., Q1 12:00, Q1 11:45, Q1 11:30)
4. Send messages and verify delays match offsets

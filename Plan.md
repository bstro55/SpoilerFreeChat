# SpoilerFreeChat - Technical Plan

## Project Overview

A web application enabling spoiler-free live sports chat by synchronizing message delivery based on each user's broadcast delay.

---

## Recommended Tech Stack

### Frontend
| Technology | Purpose | Why |
|------------|---------|-----|
| **React 18** | UI Framework | Best ecosystem for real-time chat, most tutorials/resources |
| **Vite** | Build Tool | Fast dev server, simpler than Next.js for beginners |
| **JavaScript** | Language | Start here, add TypeScript later (3-6 months) |
| **Shadcn/UI** | Components | Copy-paste ownership, built on Radix, Tailwind-based |
| **Zustand** | State Management | Minimal boilerplate, simpler than Redux |
| **Socket.IO Client** | Real-time | Matches backend, handles reconnection |

### Backend
| Technology | Purpose | Why |
|------------|---------|-----|
| **Node.js 20+** | Runtime | Same language as frontend, excellent real-time support |
| **Express** | Framework | Minimal, beginner-friendly, most documentation |
| **Socket.IO** | WebSockets | Auto-reconnection, rooms, fallbacks built-in |
| **JavaScript** | Language | Consistency with frontend |

### Data Storage
| Technology | Purpose | Why |
|------------|---------|-----|
| **In-Memory Maps** | Ephemeral State | User offsets, message queues, active connections |
| **PostgreSQL (Supabase)** | Persistent Data | Add later for accounts/history (skip for MVP) |
| **Prisma** | ORM | Add with database when needed |

### Deployment
| Service | Purpose | Cost |
|---------|---------|------|
| **Koyeb** | Backend hosting | Free tier (WebSocket support) |
| **Vercel** | Frontend hosting | Free tier |
| **Supabase** | Database (future) | Free tier (500MB) |

### Security
| Package | Purpose |
|---------|---------|
| `helmet` | HTTP security headers |
| `cors` | Cross-origin control |
| `express-rate-limit` | Spam prevention |
| `validator` | Input validation |

---

## Architecture

```
┌─────────────────────────┐
│   Browser (React)       │
│   - Chat UI             │
│   - Time input          │
│   - Socket.IO client    │
└───────────┬─────────────┘
            │ WebSocket
┌───────────▼─────────────┐
│   Koyeb Server          │
│   Node.js + Express     │
│   Socket.IO Server      │
│                         │
│   In-Memory State:      │
│   ├── rooms Map         │
│   ├── userOffsets Map   │
│   ├── messageQueues Map │
│   └── messageBuffer Map │
└─────────────────────────┘
```

### Message Flow
1. User A sends message at game time "8:42 Q3"
2. Server timestamps message with server receive time
3. For each recipient, calculate: `deliverAt = now + recipientOffset` (offset relative to room's canonical baseline)
4. Queue message or deliver immediately (if offset = 0)
5. Every 100ms, check queues and deliver ready messages
6. Add message to room's buffer (keep last ~50 for rejoin)

---

## Project Structure (Monorepo)

```
SpoilerFreeChat/
├── Claude.md                 # Project documentation
├── Plan.md                   # This file
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Main component, routing
│       ├── main.jsx          # Entry point
│       ├── components/
│       │   ├── ChatRoom.jsx  # Chat UI, messages, input
│       │   ├── TimeSync.jsx  # Game time input
│       │   ├── UserList.jsx  # Room participants
│       │   └── JoinRoom.jsx  # Room code entry
│       ├── hooks/
│       │   └── useSocket.js  # Socket.IO connection
│       └── store/
│           └── chatStore.js  # Zustand state
└── backend/
    ├── package.json
    ├── server.js             # Express + Socket.IO setup
    ├── services/
    │   ├── roomManager.js    # Room/user state
    │   ├── messageQueue.js   # Delay logic
    │   └── timeUtils.js      # Offset calculations
    └── middleware/
        └── security.js       # Rate limiting, validation
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic chat working without delay logic

1. Initialize Vite React app
2. Initialize Node.js Express server
3. Set up Socket.IO (client + server)
4. Build basic chat UI (send/receive messages)
5. Implement room joining (hardcoded room first)

**Deliverable:** Users can join a room and chat in real-time

---

### Phase 2: Time Synchronization (Week 2)
**Goal:** Calculate user offsets

6. Build time input UI (quarter selector, minutes/seconds)
7. Send game time to server on update
8. Store user state (nickname, game time, connected timestamp)
9. Implement offset calculation algorithm:
   - First user to join sets the room's canonical baseline (their reference point)
   - Convert game time to elapsed seconds
   - Calculate user's reference point: `realTime - gameElapsedSeconds`
   - Each user's offset = difference from canonical baseline
10. Display offset to user ("You are 23s behind live")

**Deliverable:** Users see their calculated delay offset

---

### Phase 3: Message Queueing (Week 3) ✅ COMPLETE
**Goal:** Delay messages based on offsets

11. ✅ On message send, calculate delivery time per recipient
12. ✅ Queue messages with `deliverAt` timestamp
13. ✅ Implement 100ms interval to check queues
14. ✅ Deliver messages when `deliverAt <= now`
15. ✅ Handle immediate delivery for offset=0 users
16. ✅ Order messages by server receive time (game-time ordering is future enhancement)
17. ✅ Implement message buffer per room (~50 messages) for rejoin/refresh

**Deliverable:** Messages arrive delayed appropriately ✅ Tested and working!

---

### Phase 4: Polish & Edge Cases (Week 4) ✅ COMPLETE
**Goal:** Handle real-world scenarios

17. ✅ Dynamic room creation via room codes
18. ✅ "Resync" button for users to update their time
19. ✅ Handle user disconnect (cleanup state)
20. ✅ Add rate limiting (10 messages/minute)
21. ✅ Input validation and XSS prevention
22. ✅ Basic styling with Shadcn/UI
23. ✅ Error handling and user feedback
24. ✅ Require sync before messaging (SyncModal on join)

**Deliverable:** Production-ready MVP ✅

---

### Phase 5: Deployment (Week 5)
**Goal:** Live on the internet

24. Configure environment variables
25. Set up CORS for production domains
26. Deploy backend to Koyeb
27. Deploy frontend to Vercel
28. Test WebSocket connection in production
29. Set up basic monitoring (health endpoint)

**Deliverable:** Accessible public URL

---

## Core Algorithm: Offset Calculation

```javascript
// When user updates their game time:
function calculateOffset(userId, gameTimeSeconds, roomId) {
  const room = rooms.get(roomId);
  const now = Date.now();

  // Reference point = when the game "started" in real-world time for this user
  const userReference = now - (gameTimeSeconds * 1000);

  // Store user's reference point
  room.users.get(userId).referenceTime = userReference;

  // First user sets the canonical baseline for the room
  // This prevents one incorrect user from skewing everyone's offsets
  if (!room.canonicalBaseline) {
    room.canonicalBaseline = userReference;
  }

  // Calculate offset relative to canonical baseline
  // Positive offset = user is behind the baseline (messages delayed)
  // Zero offset = user is at or ahead of baseline (messages immediate)
  const user = room.users.get(userId);
  user.offset = Math.max(0, room.canonicalBaseline - userReference);
}
```

**Why canonical baseline?** The original "find the live user" approach had a vulnerability: one user entering an incorrect time (e.g., claiming to be in Q4 when everyone else is in Q1) would become the "live" baseline and skew all offsets. A fixed baseline set by the first user is more predictable.

---

## MVP Scope Decisions

### In Scope (MVP)
- Anonymous users with nicknames (no accounts)
- Single sport support (basketball: 4 quarters, 12:00 each)
- Manual room codes (no game discovery)
- In-memory state (lost on server restart)
- In-memory message buffer per room (~50 messages) for refresh/rejoin
- New joiners see recent chat history (last ~50 messages)

### Out of Scope (Future)
- User accounts and authentication
- Database persistence
- Reconnection with queue preservation
- Multi-sport support
- Game schedule integration
- Mobile app

---

## Security Checklist

### Critical (Implement Immediately)
- [ ] HTTPS in production (automatic on Koyeb/Vercel) - Phase 5
- [x] Environment variables for secrets
- [x] Input validation (nickname: 1-30 chars alphanumeric, message: 1-500 chars)
- [x] XSS prevention (use React's default escaping, never dangerouslySetInnerHTML)
- [x] Rate limiting (10 messages/minute/user)
- [x] `helmet` middleware for security headers
- [x] CORS whitelist (specific frontend domain only)

### Important (Add Soon)
- [ ] Connection rate limiting per IP
- [ ] Max queue size per user (100 messages)
- [ ] Profanity filter for nicknames
- [ ] Session expiration (4 hours)

---

## Testing Strategy

### Manual Testing
- Open 3+ browser tabs as different users
- Test with varying offsets (0s, 15s, 30s, 60s)
- Test rapid message sending
- Test disconnect/reconnect scenarios

### Automated Testing (Phase 2+)
- Unit tests for `timeUtils.js` (offset calculations)
- Unit tests for `messageQueue.js` (queue operations)
- Integration tests for Socket.IO events

### Test Commands
```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && npm test
```

---

## Local Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup
```bash
# Clone repo
git clone <repo-url>
cd SpoilerFreeChat

# Backend
cd backend
npm install
cp .env.example .env
npm run dev  # Runs on http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### Environment Variables

**backend/.env**
```
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**frontend/.env**
```
VITE_SOCKET_URL=http://localhost:3001
```

---

## Key Files to Create First

1. `backend/server.js` - Express + Socket.IO setup
2. `backend/services/roomManager.js` - Room/user state management
3. `frontend/src/App.jsx` - Main React component
4. `frontend/src/hooks/useSocket.js` - Socket.IO connection hook
5. `frontend/src/components/ChatRoom.jsx` - Chat UI

---

## Verification Plan

After each phase, verify:

1. **Phase 1:** Can two users in different browsers chat in real-time?
2. **Phase 2:** Do offset calculations match expected values? (Test: User A at 10:00 Q1, User B at 9:30 Q1 = 30s offset)
3. **Phase 3:** Does User B receive User A's message 30 seconds after User A sends it?
4. **Phase 4:** Does rate limiting block spam? Does input validation reject invalid data?
5. **Phase 5:** Does the deployed app work with WebSocket connections?

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 10-15 hours | Week 1 |
| Phase 2: Time Sync | 15-25 hours | Week 2 |
| Phase 3: Queueing | 15-25 hours | Week 3 |
| Phase 4: Polish | 15-25 hours | Week 4 |
| Phase 5: Deploy | 8-15 hours | Week 5 |
| **Total** | **63-105 hours** | **5 weeks** |

*Note: Estimates assume ~20 hours/week of focused work. Add 50% buffer for learning curve.*

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Tech stack | React + Vite + Node.js + Express + Socket.IO |
| Database | Skip for MVP, add Supabase later |
| TypeScript | Start with JavaScript, migrate later |
| Authentication | Anonymous + nicknames for MVP |
| Deployment | Koyeb (backend) + Vercel (frontend) |
| Reconnection | In-memory buffer (~50 msgs) for refresh/rejoin |
| Sports support | Basketball only for MVP |

---

## Future Enhancements (Post-MVP)

### Phase 6: Persistence
- Add Supabase PostgreSQL + Prisma
- Persist chat history per room
- Session-based reconnection (preserve queued messages)

### Phase 7: Authentication
- Add Supabase Auth
- Optional user accounts
- Persistent nicknames and preferences

### Phase 8: Multi-Sport Support
- Sport selector on room creation
- Different time formats per sport (football, soccer, hockey, etc.)
- Baseball innings support (no clock)

### Phase 9: Enhanced Features
- Game schedule integration (auto-create rooms)
- Typing indicators
- Emoji reactions
- Message threading

### Phase 10: Mobile
- React Native app
- Push notifications for delayed messages
- Offline queue support

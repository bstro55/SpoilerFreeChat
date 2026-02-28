# SpoilerFreeChat: Product Roadmap & Implementation Plan

*Generated from full codebase audit, organized as a working reference document.*

---

## ✅ Completed — Session 2026-02-24

All 6 remaining Phase 1 code items done (P1-B deferred pending name/logo):

1. ✅ **P1-D** — Removed all 20+ `console.log` / `console.error` calls from production frontend (`useSocket.js`, `AuthModal.jsx`)
2. ✅ **P1-E** — Room code now regenerates each time `CreateRoomModal` opens (`CreateRoomModal.jsx`)
3. ✅ **P1-F** — `console.warn` replaced with structured `logger.warn` in `messageQueue.js`
4. ✅ **P1-G** — Deleted dead `Header.jsx` (68 lines, never imported)
5. ✅ **P1-H** — Email format regex validation added to magic link form (`AuthModal.jsx`)
6. ✅ **E1-G** — `pino-pretty` moved from `dependencies` → `devDependencies` in `backend/package.json`

---

## ✅ Completed — Session 2026-02-17

All 8 items from the first session are done:

1. ✅ **E1-B** — Fixed page title (`index.html`), added meta description, OG tags, theme-color
2. ✅ **E1-A** — Added env var validation on server startup (`DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGIN`)
3. ✅ **E1-C** — Graceful server shutdown added to `server.js`, duplicate handlers removed from `database.js`
4. ✅ **E1-D** — Clipboard copy failures now show an `alert()` with the room code as fallback
5. ✅ **E1-E** — Create Room and Join by Code forms now display inline validation errors
6. ✅ **E1-F** — PreferencesModal save errors now surface inside the modal
7. ✅ **P1-C** — `@tailwindcss/typography` installed (Tailwind v4 `@plugin` syntax); `/privacy` and `/terms` now styled
8. ✅ **P1-A** — Notification sounds implemented via Web Audio API (880Hz ping on incoming messages)

---

## Where to Start Next Session

Phase 1 code items are complete. One deferred process step remains, then move to Phase 2:

1. **P1-B** — Submit for Google OAuth verification *(deferred — waiting on final app name and logo)*
2. ✅ **P2-A** — Add product analytics (PostHog) — `main.jsx`, `useSocket.js`, `CreateRoomModal.jsx`, `HomePage.jsx`
3. ✅ **P2-B** — Build shareable room invite link (`/join/:roomCode` route) — `App.jsx`, `HomePage.jsx`, `ChatRoom.jsx`
4. ✅ **E2-A** — Add ESLint `no-console` rule + `husky` pre-commit hook — `eslint.config.js`, `.husky/pre-commit`
5. ✅ **E2-B** — Add Prettier for consistent code formatting — `.prettierrc`, both packages
6. ✅ **E2-C** — Add rate limiting to REST endpoints (`/api/user/*`) — `backend/server.js`
7. ✅ **E2-F** — Fix timezone bug in date display (`HomePage.jsx` lines 46–51)

---

## How to Use This Document

This roadmap is split into three phases:
- **Phase 1 — Pre-Traction (Do Now):** Must-fix items before meaningfully sharing the app with real users. These are either broken, embarrassing, or actively damage trust.
- **Phase 2 — Early Growth (First ~3 Months Live):** Items that become important once real users exist and you're trying to retain and grow them.
- **Phase 3 — Scaling (Once Userbase Is Growing):** Infrastructure and business-layer investments that only matter at scale.

Each item includes the relevant files so you can pick it up and start immediately.

---

## Phase 1 — Pre-Traction: Fix Before Real Users

*These items are either broken, deceptive, or will be noticed immediately by anyone demoing the app.*

---

### 🔴 P1-A: Remove or Implement Notification Sounds

**Why it matters:** The "Notification Sounds" toggle in Preferences is fully wired to the database and saves correctly — but sounds never actually play anywhere in the app. This is the single most credibility-damaging item: anyone who opens Preferences and flips this toggle will immediately notice nothing happens.

**Two options:**
- **Option A (Fast):** Remove the toggle entirely. Delete the UI, remove it from the preferences save logic, and drop the DB column in a migration.
- **Option B (Right):** Implement it. Use the Web Audio API or a small audio file, and trigger a sound when a `new-message` event fires and the browser tab is visible.

**Files involved:**
- `frontend/src/components/PreferencesModal.jsx` (line 118) — the toggle UI
- `frontend/src/hooks/useSocket.js` — where `new-message` is received (add sound trigger here)
- `frontend/src/store/authStore.js` — where preferences are stored
- `backend/prisma/schema.prisma` — `notificationSound` column on User table (remove if Option A)

---

### 🔴 P1-B: Submit for Google OAuth Verification

**Why it matters:** Every user who clicks "Sign in with Google" sees a Google security warning saying the app is unverified. This is the first impression for authenticated users and it's alarming.

**This is a process step, not a code change.** Prerequisites are already done:
- ✅ Privacy Policy at `/privacy`
- ✅ Terms of Service at `/terms`

**⏸ Deferred:** Waiting on final app name and logo to be locked in before submitting. Submitting with a placeholder name or no logo will require re-verification later.

**Steps (when ready):**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Add Privacy Policy URL and Terms of Service URL
3. Upload an app logo (120x120px)
4. Click "Prepare for verification" → Submit
5. Turnaround: ~2–4 weeks

---

### 🔴 P1-C: Fix Legal Page Styling (10-Minute Fix)

**Why it matters:** The Privacy Policy (`/privacy`) and Terms of Service (`/terms`) pages use Tailwind `prose` classes but the `@tailwindcss/typography` plugin was never installed. They render as raw, unstyled text — looks broken.

**Fix:** Install the typography plugin and add it to the Tailwind config.

**Files involved:**
- `frontend/package.json` — add `@tailwindcss/typography` to devDependencies
- `frontend/tailwind.config.js` — add `require('@tailwindcss/typography')` to plugins array
- `frontend/src/pages/PrivacyPolicy.jsx` — already uses `prose` classes, will work automatically
- `frontend/src/pages/TermsOfService.jsx` — same

---

### 🟠 P1-D: Remove Console Logs from Production Frontend

**Why it matters:** The frontend ships 20+ `console.log` and 8+ `console.error` calls. Any user opening DevTools sees internal socket events, state dumps, and debug output — unprofessional and leaks internal architecture.

**Files involved:**
- `frontend/src/hooks/useSocket.js` — most of the logs (~20+)
- `frontend/src/components/ChatRoom.jsx` — a few logs
- `frontend/src/components/HomePage.jsx` — a few logs

**Approach:** Either delete them or wrap in `if (import.meta.env.DEV) { ... }` for logs you want to keep during local development.

---

### 🟠 P1-E: Fix Generated Room Code Not Refreshing

**Why it matters:** In the Create Room modal, the room code is generated once when the component mounts. If a user closes the modal and reopens it, they get the same code — which they may have already shared or abandoned.

**File:** `frontend/src/components/CreateRoomModal.jsx` (line 35)

**Fix:** Move the code generation into a `useEffect` or `useCallback` that runs each time the modal opens, so each session gets a fresh code.

---

### 🟠 P1-F: Fix console.warn in Backend Message Queue

**Why it matters:** One `console.warn` in the message queue service breaks the pattern of structured logging everywhere else in the backend. Small, but worth fixing before production increases.

**File:** `backend/services/messageQueue.js` (line 158)

**Fix:** Replace `console.warn(...)` with `logger.warn({ socketId, queueSize }, 'Message queue full, dropping oldest message')`.

---

### 🟢 P1-G: Remove Dead Code — Header.jsx

**File:** `frontend/src/components/Header.jsx` (68 lines, never imported)

**Fix:** Delete the file. Its functionality is duplicated inside `ChatRoom.jsx`'s own header.

---

### 🟢 P1-H: Add Email Format Validation to Magic Link

**File:** `frontend/src/components/AuthModal.jsx` (lines 75–80)

**Fix:** Add a simple regex or use the browser's built-in `input type="email"` validation before calling `supabase.auth.signInWithOtp()`.

---

## Phase 2 — Early Growth: First ~3 Months Live

*Once real users exist, these are the gaps that will cause churn, block growth, or kill word-of-mouth.*

---

### 🔴 P2-A: Add Product Analytics (PostHog)

**Why it matters:** Right now you have no way to answer: "Is anyone using this? What rooms are being created? Are users actually syncing?" Without this data you're flying blind on product decisions.

**What to track:**
- Room created
- Room joined (new vs. returning)
- First sync completed
- Message sent
- User signed in (Google vs. guest)
- Session duration

**Tool:** PostHog has a generous free tier and a simple JS SDK. Install in the frontend (`main.jsx`) and fire events at key moments.

**Files to modify:**
- `frontend/src/main.jsx` — initialize PostHog
- `frontend/src/hooks/useSocket.js` — fire events on join, sync, message
- `frontend/src/components/CreateRoomModal.jsx` — fire event on room creation

---

### 🔴 P2-B: Build a Shareable Room Invite Link

**Why it matters:** Currently, the only way to invite someone to a room is to tell them the room code out-of-band (text, DM, etc.). There's no shareable URL that opens the app and pre-fills the join form. This is the primary growth mechanism — every room shared is a potential new user — and it doesn't exist.

**What to build:**
- A URL format like `https://yourapp.com/join/GAME-X7K2`
- When a user opens this URL, the Join form is pre-filled with the code
- If they're already in the room, redirect them to the chat

**Files involved:**
- `frontend/src/App.jsx` — add a `/join/:roomCode` route
- `frontend/src/components/HomePage.jsx` — read `roomCode` from URL params and pre-fill the join form
- `backend/server.js` — no changes needed, existing `join-room` socket event handles this

---

### 🔴 P2-C: Simplify the Sync UX — Add Countdown Timer Flow

**Why it matters:** The current sync flow requires users to manually type their game clock at the exact right moment. This is too technical and error-prone for general audiences. The single biggest UX improvement you can make to the core feature.

**What to build:**
- A "Sync with friends" flow where one user (the room creator) initiates a countdown
- All users in the room see a "Sync in 3... 2... 1... NOW" overlay
- At "NOW," the app automatically reads each user's locally-entered game time and submits it simultaneously
- This ensures all users sync at the same real-world moment (the key requirement for accuracy)

**Files involved:**
- `backend/server.js` — add `start-sync-countdown` and `sync-countdown-tick` socket events
- `frontend/src/components/ChatRoom.jsx` — show countdown overlay
- `frontend/src/components/TimeSync.jsx` — allow pre-filling game time before countdown triggers

---

### 🟠 P2-D: Implement Browser Push Notifications (or At Minimum Tab Alerts)

**Why it matters:** When a user switches to another tab, there's no way to know a message arrived. This kills async usage of the app — users forget to check back.

**Two-tier approach:**
- **Tier 1 (Fast):** Play an audio sound + set the browser tab title to "New message" when a message arrives in a background tab
- **Tier 2 (Complete):** Add Web Push API support for true push notifications, even when the browser is closed

**Files involved:**
- `frontend/src/hooks/useSocket.js` — on `new-message`, check `document.hidden` and trigger alert
- Tier 2 requires a service worker (`frontend/public/sw.js`) and backend VAPID key setup

---

### 🟠 P2-E: Add Typing Indicators

**Why it matters:** Standard expectation in any chat product. Without it, conversations feel dead — users don't know if their friend is about to respond or has walked away.

**What to build:**
- When user starts typing, emit a `typing-start` socket event
- Backend broadcasts `user-typing` to the room (with debounce/timeout)
- Frontend shows "Alex is typing..." below the message list

**Files involved:**
- `backend/server.js` — add `typing-start` and `typing-stop` socket events
- `frontend/src/components/ChatRoom.jsx` — show typing indicator above the input
- `frontend/src/hooks/useSocket.js` — emit typing events on `onChange`

---

### 🟠 P2-F: Extend Message History Retention

**Why it matters:** Messages disappear after 7 days and only the last 50 are shown per room. A user returning to a game-day room the next morning has no history. This is a significant UX gap vs. any chat product.

**Files involved:**
- `backend/server.js` — `cleanupOldData()` function sets the 7-day window
- `backend/services/roomManager.js` — `messages` array is capped at 50 in memory; DB is the source of truth for history
- `backend/services/sessionManager.js` — history query on join

**Approach:** Extend cleanup to 30 days as a simple first step. Consider making history a premium feature later.

---

### 🟠 P2-G: Add Basic Content Moderation — Report Message Button

**Why it matters:** There is currently no way for users to report bad content or remove toxic users from a room. For a chat product, this is a real liability.

**Minimum viable moderation:**
- A "Report" button on hover over any message
- Reports stored in a new DB table with message content, reporter, and timestamp
- An email notification to you (the admin) when a report is filed
- A `kick-user` socket event callable by room creators

**Files involved:**
- `backend/prisma/schema.prisma` — add `Report` table
- `backend/server.js` — add `report-message` and `kick-user` socket events
- `frontend/src/components/ChatRoom.jsx` — add report button on message hover

---

### 🟢 P2-H: Build a Demo Mode for Solo Users

**Why it matters:** A user or investor landing on the app alone can't experience the core feature (message delay) without opening multiple browser tabs. A demo mode would dramatically help word-of-mouth and investor demos.

**What to build:**
- A "Try a Demo" button on the homepage
- Creates a demo room with a simulated second participant ("Demo Bot")
- Demo Bot sends periodic messages that arrive with a configurable delay (e.g., 15 seconds)
- Clear UI indicator that this is a demo

**Files involved:**
- `frontend/src/components/HomePage.jsx` — "Try Demo" button
- `backend/server.js` — a `join-demo` socket event that simulates a second user

---

### 🟢 P2-I: Finalize Branding and Domain

**Why it matters:** The CLAUDE.md has an entire "Domain & Branding Change Checklist" suggesting the name may change. Lock in the brand before you have significant organic traffic pointing to the wrong domain.

**Checklist already exists in CLAUDE.md** — execute it once the name is decided.

---

## Phase 3 — Scaling: When the Userbase Is Growing

*These only become necessary at meaningful scale. Invest here too early and you're optimizing for problems you don't have yet.*

---

### 🔴 P3-A: Externalize Room State — Redis-Backed Architecture

**Why it matters:** All room state, message queues, and user offsets currently live in Node.js in-memory data structures. This means:
- **No horizontal scaling:** You cannot run more than one server instance
- **Server restart = everyone disconnected** and queued messages lost
- Once you have real usage, this becomes the ceiling on your entire infrastructure

**What to build:**
- Replace in-memory `Map` structures in `roomManager.js` and `messageQueue.js` with Redis
- Use Redis pub/sub for cross-instance socket message delivery (or Socket.IO Redis adapter)
- This enables running multiple server instances behind a load balancer

**Files to redesign:**
- `backend/services/roomManager.js` — move room/user state to Redis hashes
- `backend/services/messageQueue.js` — move message queues to Redis sorted sets (score = deliverAt timestamp)
- `backend/server.js` — add Socket.IO Redis adapter

---

### 🔴 P3-B: Build a Monetization Layer

**Why it matters:** Without revenue, growth is unsustainable. Design the upgrade path before you need it.

**Suggested tiers:**
- **Free:** Up to 5 users per room, 7-day message history, standard room codes
- **Pro ($X/month):** Up to 20 users per room, 30-day history, custom room codes, priority support
- **Group ($Y/month):** Unlimited users, permanent history, admin moderation tools, analytics

**What to build:**
- Stripe subscription integration
- Room size limits enforced in `backend/server.js` `join-room` handler
- Upgrade prompt in `frontend/src/components/ChatRoom.jsx` when hitting limits

---

### 🟠 P3-C: Build Admin Dashboard

**Why it matters:** As users grow, you need visibility into the system without digging into logs.

**What to build:**
- Internal-only route (password-protected or IP-restricted)
- Shows: active rooms, total users, messages/day, error rate, reports queue
- Ability to view/delete flagged messages, kick users, disable rooms

---

### 🟠 P3-D: Email Capture and Re-Engagement

**Why it matters:** Guest users who have a great experience have no path back to the app. Email is the cheapest re-engagement channel.

**What to build:**
- After a guest's first session, prompt: "Save your room history — create a free account"
- Post-game recap email: "Your room sent X messages across Y minutes!"
- Weekly email for users with recent rooms: "Your friend joined a room — rejoin?"

**Files involved:**
- `frontend/src/components/ChatRoom.jsx` — post-session prompt
- Email service integration (Resend or SendGrid) in backend

---

### 🟠 P3-E: Build a Full Automated Test Suite

**Why it matters:** At scale, manual testing is no longer viable and regressions become costly. This also becomes a hiring signal — engineers want to join projects with tests.

**What to build:**
- **Unit tests:** `timeUtils.js` (offset math), `validation.js`, `messageQueue.js` delivery logic
- **Integration tests:** Socket.IO event handlers (join room, sync, send message)
- **E2E tests:** Full multi-user flow using Playwright

**Tools:** Vitest (frontend), Jest (backend), Playwright (e2e)

---

### 🟢 P3-F: Prune Rate Limiter Memory Automatically

**Why it matters:** `rateLimiter.js` stores timestamp arrays for every user/IP that ever connected. These arrays are never cleaned up. At thousands of users, this becomes a memory leak.

**File:** `backend/services/rateLimiter.js`

**Fix:** In the `disconnect` handler in `server.js`, call a new `clearUserRateLimits(socketId)` method to remove stale entries.

---

## Quick Reference Summary

| Item | Phase | Effort | Impact |
|------|-------|--------|--------|
| Fix notification sounds / remove toggle | 1 | Low | 🔴 Critical trust |
| Submit Google OAuth verification | 1 | Low (process) | 🔴 Critical UX |
| Fix legal page styling | 1 | Low | 🔴 Pre-req for OAuth |
| Remove console.logs from frontend | 1 | Low | 🟠 Professionalism |
| Fix room code not regenerating | 1 | Low | 🟠 Bug |
| Fix console.warn in messageQueue | 1 | Low | 🟢 Consistency |
| Remove dead Header.jsx | 1 | Low | 🟢 Cleanup |
| Add email validation to magic link | 1 | Low | 🟢 Polish |
| Add product analytics (PostHog) | 2 | Low | 🔴 Growth visibility |
| Shareable room invite link | 2 | Low-Med | 🔴 Core growth mechanic |
| Sync countdown timer flow | 2 | Medium | 🔴 Core UX |
| Browser notifications / tab alerts | 2 | Medium | 🟠 Retention |
| Typing indicators | 2 | Low-Med | 🟠 Chat standard |
| Extend message history (30 days) | 2 | Low | 🟠 Retention |
| Basic content moderation (report button) | 2 | Medium | 🟠 Safety |
| Demo mode for solo users | 2 | Medium | 🟢 Growth/demos |
| Finalize branding and domain | 2 | Low (decision) | 🟢 Credibility |
| Redis-backed architecture | 3 | High | 🔴 Scale ceiling |
| Monetization layer | 3 | High | 🔴 Revenue |
| Admin dashboard | 3 | Medium | 🟠 Operations |
| Email capture & re-engagement | 3 | Medium | 🟠 Retention |
| Full automated test suite | 3 | High | 🟠 Engineering health |
| Rate limiter memory pruning | 3 | Low | 🟢 Memory hygiene |

---

---

# Engineering Quality Roadmap

*Added from senior engineering code review. These are code quality, security, architecture, and tooling issues — distinct from the product/investor findings above.*

---

## Phase 1 — Engineering: Fix Before Real Users

---

### 🔴 E1-A: Add Startup Environment Variable Validation

**Why it matters:** The server boots silently with missing environment variables and fails at runtime with cryptic errors like "Cannot read property of undefined." A missing `SUPABASE_URL` on Koyeb would cause every authentication attempt to silently fail with no clear indication of why.

**Fix:** Add a validation block at the very top of the server, before any setup code, that checks all required variables and throws an explicit error if any are missing:

```javascript
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'SUPABASE_URL', 'CORS_ORIGIN'];
const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
```

**File:** `backend/server.js` (add at the very top, before imports are used)

---

### 🔴 E1-B: Fix Page Title and Add Social Meta Tags

**Why it matters:** The browser tab currently shows "frontend" (literally — that's the content of `<title>` in `index.html`). Every shared link to the app shows no title, no description, no image in Slack, iMessage, or Twitter previews.

**Fix:** Update `frontend/index.html` with:
- Correct `<title>SpoilerFreeChat</title>`
- `<meta name="description" content="...">` — for Google and link previews
- `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">` — for social sharing
- `<meta name="theme-color" content="#0d9488">` — for the teal color in mobile browser chrome

**File:** `frontend/index.html`

---

### 🔴 E1-C: Implement Graceful Server Shutdown

**Why it matters:** When Koyeb deploys a new version of your server, it sends a `SIGTERM` signal. Currently the server ignores it and is killed abruptly. Every user in an active room gets a sudden disconnection instead of a clean "reconnecting..." experience. This happens on every single deployment.

**What to add:**
```javascript
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');
  io.close();           // Stop accepting new connections, close existing ones cleanly
  server.close();       // Stop accepting HTTP requests
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Note: `database.js` already handles `prisma.$disconnect()` via its own signal handlers — consolidate those here to avoid duplicate handlers.

**File:** `backend/server.js` (add near the bottom, after server starts)

---

### 🟠 E1-D: Fix Silent Clipboard Copy Failures

**Why it matters:** Both copy buttons (room code in ChatRoom sidebar, room code in CreateRoomModal) have empty `catch` blocks. When clipboard access fails — which it does in some browsers, over HTTP, or in iframes — the user gets no feedback at all. They don't know if the copy worked.

**Fix:** Show a fallback message or display the code text so the user can manually select it:
```javascript
catch (err) {
  // Fallback: show the code in an alert so user can copy manually
  alert(`Copy failed. Your room code is: ${roomId}`);
}
```

**Files:**
- `frontend/src/components/ChatRoom.jsx` (line ~144)
- `frontend/src/components/CreateRoomModal.jsx` (line ~58)

---

### 🟠 E1-E: Fix Silent Form Validation Failures

**Why it matters:** Multiple forms silently return early on invalid input without telling the user what went wrong. If a user tries to submit with an empty nickname, nothing happens — no error message, no shake, no indication of any kind.

**Affected flows:**
- Create room with empty/too-long nickname → silent return
- Join by code with empty nickname or empty code → silent return

**Fix:** Add an `error` state to each form and display it below the relevant input when validation fails.

**Files:**
- `frontend/src/components/CreateRoomModal.jsx` (line ~70)
- `frontend/src/components/HomePage.jsx` (line ~152)

---

### 🟠 E1-F: Fix PreferencesModal Save Error Not Shown to User

**Why it matters:** When saving preferences fails (network error, auth error, etc.), the error is logged to the browser console but the user sees nothing. The Save button just re-enables. The user has no idea their preferences weren't saved.

**Fix:** Add an `error` state and render it as an alert inside the modal when save fails.

**File:** `frontend/src/components/PreferencesModal.jsx` (line ~58)

---

### 🟠 E1-G: Move pino-pretty to devDependencies

**Why it matters:** `pino-pretty` is a human-readable log formatter used for development. It's currently in production `dependencies`, which means it gets installed on Koyeb unnecessarily. In production you want raw JSON logs (which Koyeb/Datadog can parse), not pretty-printed ones.

**Fix:** `npm install --save-dev pino-pretty` in the backend, remove from `dependencies`.

**File:** `backend/package.json`

---

## Phase 2 — Engineering: Early Growth

---

### 🔴 E2-A: Add ESLint no-console Rule + Pre-commit Hook

**Why it matters:** The `no-console` ESLint rule would have automatically caught the 20+ `console.log` calls that shipped to production — before they were ever committed. Currently ESLint runs but doesn't flag console statements.

Adding `husky` + `lint-staged` means ESLint runs automatically on every `git commit`, blocking the commit if there are violations. This is the standard way to prevent code quality regressions.

**What to add:**
1. `'no-console': ['warn', { allow: ['error'] }]` to `eslint.config.js`
2. `husky` + `lint-staged` packages
3. A pre-commit hook that runs `eslint --fix` on staged files

**Files:** `frontend/eslint.config.js`, root `package.json`

---

### 🔴 E2-B: Add Prettier for Consistent Code Formatting

**Why it matters:** There's currently no code formatter. Inconsistent indentation, quote styles, and trailing commas exist throughout the files. On a team, this causes noisy diffs and constant style debates. Even solo, it's a maintenance burden.

**Fix:** Install Prettier, add a `.prettierrc` config, and integrate it with lint-staged so files are auto-formatted on commit.

**Files:** Add `.prettierrc` to project root; add Prettier to both `frontend` and `backend` devDependencies

---

### 🟠 E2-C: Add Rate Limiting to HTTP REST Endpoints

**Why it matters:** The two REST endpoints (`GET/PATCH /api/user/preferences` and `GET /api/user/recent-rooms`) have no rate limiting. Socket.IO events are well rate-limited, but these HTTP endpoints are not. An authenticated user could hammer these endpoints in a loop.

**Fix:** Apply `express-rate-limit` to these routes specifically (a separate, more generous limit than socket connections — e.g., 60 requests per minute per user).

**File:** `backend/server.js` (lines ~140–186)

---

### 🟠 E2-D: Validate Sport Type After Database Read

**Why it matters:** On reconnection, `dbRoom.sportType` is read from the database and used without validation. If the database ever has stale or invalid data (schema migration, manual edit, bug), the server could crash inside `timeUtils.gameTimeToElapsedSeconds()` with a confusing error.

**Fix:** After reading `dbRoom.sportType`, validate it against `getValidSportTypes()`. If invalid, fall back to `DEFAULT_SPORT` and log a warning.

**File:** `backend/server.js` (line ~334)

---

### 🟠 E2-E: Add Error Boundaries Around Modal Components

**Why it matters:** React renders component trees, and if any component throws during render, the entire tree unmounts. Currently, if a modal component crashes (bad data, unexpected null, etc.), the entire app goes blank. Users see a white screen with no explanation.

**Fix:** Wrap modal renders in `<ErrorBoundary>` components from the `react-error-boundary` package. If a modal crashes, only the modal fails — the rest of the app stays intact.

**File:** `frontend/src/App.jsx`

---

### 🟠 E2-F: Fix Timezone Bug in Date Display

**Why it matters:** Dates stored as `'2026-02-17'` (date-only ISO strings) are parsed by JavaScript as UTC midnight. When `.toLocaleDateString()` is called, users in timezones west of UTC (like US time zones) see the date shifted back by one day.

**Fix:** Parse date strings safely by appending a time component:
```javascript
const date = new Date(dateStr + 'T12:00:00');
```
This ensures the date renders correctly regardless of the user's timezone.

**File:** `frontend/src/components/HomePage.jsx` (lines 46–51)

---

### 🟢 E2-G: Fix Derived State Anti-Pattern — the Tick Hack

**Why it matters:** `const [, setTick] = useState(0)` is used to force the entire `ChatRoom` component to re-render every 30 seconds — just to update the "synced 2m ago" relative time strings. This is a hack that causes unnecessary re-renders of the whole chat UI.

**Fix:** Extract relative time formatting into a `useRelativeTime(timestamp)` custom hook that manages its own timer internally. Only the component using that hook re-renders on the tick, not all of ChatRoom.

**File:** `frontend/src/components/ChatRoom.jsx` (lines 45, 51)

---

### 🟢 E2-H: Add aria-labels to All Icon-Only Buttons

**Why it matters:** Screen readers announce button content. Buttons that contain only an icon (`<Menu />`, `<Copy />`, etc.) with no visible text are announced as "button" with no description — completely unusable for visually impaired users.

**Fix:** Add `aria-label="Toggle sidebar"`, `aria-label="Copy room code"`, etc. to all icon-only buttons throughout the app.

**Files:** `frontend/src/components/ChatRoom.jsx`, `frontend/src/components/CreateRoomModal.jsx`

---

### 🟢 E2-I: Manage Keyboard Focus When Modals Open

**Why it matters:** When a modal opens, keyboard focus stays wherever it was before. A keyboard-only user has to tab through the entire page to reach the modal's inputs. This is a basic accessibility requirement (WCAG 2.1 guideline).

**Fix:** In each modal's open effect, move focus to the first input or the modal container:
```javascript
useEffect(() => {
  if (open) firstInputRef.current?.focus();
}, [open]);
```

**Files:** `frontend/src/components/CreateRoomModal.jsx`, `frontend/src/components/AuthModal.jsx`, `frontend/src/components/SyncModal.jsx`

---

## Phase 3 — Engineering: Scale & Architecture

---

### 🔴 E3-A: Fix Race Condition in Concurrent Offset Recalculation

**Why it matters:** When two users sync at exactly the same moment, both trigger `recalculateOffsets()` simultaneously. Each reads the current room state independently, calculates new offsets, and the last one to write wins — potentially overwriting valid data with stale calculations. This means two users who sync at the same instant could end up with incorrect delays.

**Fix:** Serialize offset recalculation per room using a simple async queue or mutex. Only one recalculation can run for a given room at a time.

**File:** `backend/services/roomManager.js` (lines 162–200)

---

### 🔴 E3-B: Fix Unhandled Promise in Game Time Persistence

**Why it matters:** When a user syncs, their game time is written to the database using fire-and-forget (not awaited). If this write fails, the user's sync state is lost — but neither the client nor the server knows about it. On the next page refresh, the user's game time won't be restored and they'll appear unsynced.

**Fix:** Either await the operation (and handle the error explicitly), or at minimum emit a low-priority warning event to the client so they know to resync if they refresh.

**File:** `backend/server.js` (lines 488–495)

---

### 🟠 E3-C: Split useSocket.js into Focused Hooks

**Why it matters:** `useSocket.js` is 439 lines and handles 6 entirely different concerns: socket connection management, reconnection logic, auth token updates, room joining, game time syncing, and message sending. This is called a "god module" — it's impossible to test, difficult to debug, and will grow unboundedly as features are added.

**What to split into:**
- `useSocketConnection.js` — manages the socket instance, connection state, auth token
- `useRoomSession.js` — handles joining, leaving, session persistence in localStorage
- `useGameSync.js` — handles sync-game-time events and offset state
- `useChat.js` — handles send-message and receiving new-message events

**File:** `frontend/src/hooks/useSocket.js`

---

### 🟠 E3-D: Split server.js into Modular Route Handlers

**Why it matters:** `server.js` is 746 lines mixing Express setup, Socket.IO configuration, 3 socket event handlers, REST routes, cleanup intervals, and shutdown logic. As features are added (typing indicators, moderation, etc.), this file will become unmaintainable.

**What to split into:**
- `backend/routes/api.js` — the REST endpoints (`/api/user/*`, `/health`)
- `backend/socket/roomHandler.js` — `join-room` and `disconnect` events
- `backend/socket/syncHandler.js` — `sync-game-time` event
- `backend/socket/messageHandler.js` — `send-message` event
- `backend/server.js` — kept lean: just setup, wiring, intervals, and shutdown

**File:** `backend/server.js`

---

### 🟠 E3-E: Add CI/CD Pipeline via GitHub Actions

**Why it matters:** Currently, nothing runs automatically when code is pushed. A broken ESLint rule, a failed build, or a test failure can silently make it to production. A CI pipeline runs checks on every push/pull request so problems are caught before deployment.

**What to add:** `.github/workflows/ci.yml` that runs:
- ESLint on frontend and backend
- `npm run build` to verify the frontend builds cleanly
- Tests (once they exist)

**File:** `.github/workflows/ci.yml` (new file)

---

### 🟢 E3-F: Add TypeScript or JSDoc Type Annotations

**Why it matters:** The entire codebase has no type checking. When a function expects `{ period, minutes, seconds }` and receives `{ quarter, minutes, seconds }` (the old field name), there's no warning until a user triggers the bug at runtime. TypeScript catches these at development time.

**Pragmatic approach for now:** Add JSDoc `@param` and `@returns` comments to the most complex service files (`roomManager.js`, `timeUtils.js`, `sessionManager.js`). This gives IDE autocomplete and basic type hints without a full TypeScript migration.

**Phase 3+ goal:** Migrate to TypeScript starting with `useSocket.js` and `roomManager.js`, expanding from there.

---

## Engineering Quick Reference

| Item | Phase | Effort | Impact |
|------|-------|--------|--------|
| Add startup env var validation | E1 | Low | 🔴 Reliability |
| Fix page title & social meta tags | E1 | Low | 🔴 Professionalism |
| Implement graceful server shutdown | E1 | Low | 🔴 Deploy quality |
| Fix silent clipboard copy failures | E1 | Low | 🟠 UX |
| Fix silent form validation failures | E1 | Low | 🟠 UX |
| Fix PreferencesModal save error hidden | E1 | Low | 🟠 UX |
| Move pino-pretty to devDependencies | E1 | Low | 🟢 Hygiene |
| Add ESLint no-console + pre-commit hook | E2 | Low | 🔴 Code quality |
| Add Prettier | E2 | Low | 🔴 Code quality |
| Add rate limiting to REST endpoints | E2 | Low | 🟠 Security |
| Validate sport type after DB read | E2 | Low | 🟠 Reliability |
| Add error boundaries around modals | E2 | Low | 🟠 Reliability |
| Fix timezone bug in date display | E2 | Low | 🟠 Correctness |
| Fix tick hack / derived state anti-pattern | E2 | Low-Med | 🟢 Performance |
| Add aria-labels to icon buttons | E2 | Low | 🟢 Accessibility |
| Manage focus on modal open | E2 | Low | 🟢 Accessibility |
| Fix race condition in offset recalculation | E3 | Medium | 🔴 Correctness |
| Fix fire-and-forget game time persistence | E3 | Low | 🔴 Reliability |
| Split useSocket.js into focused hooks | E3 | High | 🟠 Maintainability |
| Split server.js into route modules | E3 | High | 🟠 Maintainability |
| Add GitHub Actions CI pipeline | E3 | Low-Med | 🟠 Engineering health |
| Add TypeScript / JSDoc types | E3 | High | 🟢 Type safety |

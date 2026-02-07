# SpoilerFreeChat Operations Playbook

A guide for managing SpoilerFreeChat in production.

## Service URLs

| Service | URL | Dashboard |
|---------|-----|-----------|
| Frontend | https://spoiler-free-chat.vercel.app | [Vercel Dashboard](https://vercel.com/dashboard) |
| Backend | https://fresh-charin-brandonorg-fb132fcb.koyeb.app | [Koyeb Dashboard](https://app.koyeb.com) |
| Database | Supabase PostgreSQL | [Supabase Dashboard](https://supabase.com/dashboard) |
| Error Tracking | Sentry | [Sentry Dashboard](https://sentry.io) |

## Health Check

The backend has a health endpoint you can use to verify it's running:

```
GET https://fresh-charin-brandonorg-fb132fcb.koyeb.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-06T12:00:00.000Z"}
```

## How to Check Logs

### Backend Logs (Koyeb)

1. Go to https://app.koyeb.com
2. Click on your app/service
3. Click the "Logs" tab
4. Use the search bar to filter logs

**Logs are now JSON-formatted** (structured logging with pino). You can search for:
- `"roomId":"GAME-X7K2"` - Find all events for a specific room
- `"nickname":"John"` - Find all events for a user
- `"level":50` - Find errors (level 50 = error, 40 = warn, 30 = info, 20 = debug)

### Frontend Logs (Vercel)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Deployments > Click a deployment > "Runtime Logs" tab

### Database (Supabase)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Logs" in the sidebar
4. You can view PostgreSQL logs and Auth logs

## How to Restart Services

### Backend (Koyeb)

1. Go to Koyeb Dashboard
2. Click on your service
3. Click "Redeploy" button (top right)

This will restart the backend with the same code. Use this if:
- The service is unresponsive
- You're seeing persistent connection errors
- Memory usage is high

### Frontend (Vercel)

Vercel redeploys automatically on git push. To force a redeploy:

1. Go to Vercel Dashboard
2. Go to Deployments
3. Click "..." on the latest deployment
4. Click "Redeploy"

## Environment Variables

### Backend (Koyeb)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (with pgbouncer) |
| `DIRECT_URL` | Direct database URL for migrations |
| `CORS_ORIGIN` | Frontend URL(s), comma-separated |
| `SUPABASE_URL` | Supabase project URL (for JWT verification) |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | Optional, defaults to `info` |

### Frontend (Vercel)

| Variable | Description |
|----------|-------------|
| `VITE_SOCKET_URL` | Backend WebSocket URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |

## Common Issues and Solutions

### "Connection closed" or "Prepared statement does not exist" errors

**Cause:** Database connection pool issues with Supabase.

**Solution:**
1. Verify `DATABASE_URL` includes `?pgbouncer=true`
2. Check Supabase Dashboard > Database > Connection Pool for errors
3. Redeploy the backend to reset connection pool

### OAuth sign-in not working

**Cause:** Usually environment variable issues.

**Checklist:**
1. Verify `SUPABASE_URL` is set in Koyeb
2. Check Supabase Auth settings (redirect URLs)
3. Check browser console for errors

### Messages not being delivered

**Symptoms:** Users can send messages but they don't appear for other users.

**Checklist:**
1. Check if WebSocket connection is established (browser console)
2. Look for Socket.IO errors in backend logs
3. Verify both users are in the same room
4. Check if either user has synced their game time

### High latency / slow messages

**Symptoms:** Messages take longer than expected to appear.

**Checklist:**
1. Check Koyeb resource usage (CPU, memory)
2. Look for slow database queries in logs
3. Check Supabase Dashboard for database performance

### Session reconnection failing

**Symptoms:** Users see "Reconnecting..." forever after page refresh.

**Checklist:**
1. Session may have expired (1 hour timeout)
2. Check for database connection errors in logs
3. Try clearing localStorage and rejoining

## Database Maintenance

### View Active Sessions

In Supabase SQL Editor:
```sql
SELECT * FROM "Session" WHERE "isConnected" = true ORDER BY "lastSeenAt" DESC;
```

### View Recent Messages

```sql
SELECT * FROM "Message" ORDER BY "timestamp" DESC LIMIT 50;
```

### Clean Up Old Data

The backend automatically runs cleanup tasks:
- Every 5 minutes: Expire disconnected sessions
- Every 24 hours: Delete sessions and messages older than 7 days

### Manual Cleanup

If needed, you can run cleanup manually in Supabase SQL Editor:
```sql
-- Delete old sessions (older than 7 days)
DELETE FROM "Session" WHERE "lastSeenAt" < NOW() - INTERVAL '7 days';

-- Delete old messages (older than 7 days)
DELETE FROM "Message" WHERE "timestamp" < NOW() - INTERVAL '7 days';
```

## Deployment Checklist

Before deploying new code:

1. [ ] Run `npm run build` locally in both frontend and backend
2. [ ] Test locally with multiple browser tabs
3. [ ] Check for TypeScript/ESLint errors
4. [ ] Commit changes with clear message
5. [ ] Push to GitHub (triggers automatic deploys)
6. [ ] Verify deployments succeeded in Vercel and Koyeb dashboards
7. [ ] Test the live site with a quick join/send message flow
8. [ ] Check Sentry for any new errors

## Scaling Considerations

**Current limits:**
- Koyeb free tier: Limited resources
- Supabase free tier: Connection pool limits
- Socket.IO: Single server (no horizontal scaling)

**If you need to scale:**
- Upgrade Koyeb to paid tier for more resources
- Upgrade Supabase for more connections
- Consider adding Redis for Socket.IO adapter (horizontal scaling)

## Emergency Contacts

- Koyeb Status: https://status.koyeb.com
- Supabase Status: https://status.supabase.com
- Vercel Status: https://www.vercel-status.com

# PhiFit - Claude Context

This document provides important context for Claude Code sessions working on PhiFit.

## Project Overview

PhiFit is a mobile-first fitness challenge web application where friends can run multi-week competitions with points, leaderboards, and token-based side challenges.

**Status**: ✅ Complete - All core features implemented and deployed to production (Vercel)
**Live URL**: https://phifit.vercel.app

## Tech Stack

- Next.js 16 (App Router) with TypeScript
- PostgreSQL (Neon) with Prisma ORM
- Tailwind CSS v4 (important: uses `@import` syntax, not `@tailwind` directives)
- bcryptjs for PIN hashing (switched from argon2 for Vercel compatibility)
- JWT sessions with httpOnly cookies
- Deployed on Vercel

## Critical Implementation Details

### Authentication
- Email + 6-digit PIN (not password)
- bcryptjs for hashing (NOT argon2 - incompatible with Vercel serverless)
- JWT stored in httpOnly cookies
- Middleware in `proxy.ts` handles route protection
- **Important**: Middleware must exclude `/api/*` routes or API calls will be redirected to login

### Database
- Uses Neon PostgreSQL
- Prisma ORM with cascade deletes configured
- Schema changes: use `npx prisma db push` (not migrate dev due to drift)
- Always run `npx prisma generate` after schema changes

### Prize Structure
- Challenges use **percentage-based** prizes (NOT fixed dollar amounts)
- Fields: `weeklyPrizePercent`, `grandPrizePercent`, `tokenChampPrizePercent`
- Actual amounts calculated: `totalPool * (percent / 100)` where `totalPool = buyInAmount * participantCount`
- Total percentages across all weeks + grand + token must not exceed 100%

### Styling
- Tailwind CSS v4 requires `@import "tailwindcss"` in globals.css
- Old v3 syntax (`@tailwind base/components/utilities`) will break styling

### Week Lifecycle
- Weeks have 3 states: UPCOMING → OPEN → LOCKED
- Automatic transitions handled by cron job at `/api/cron/lock-weeks`
- Only LOCKED weeks count towards leaderboards
- Organizers can manually lock/unlock weeks

### Token System
- Users earn 1 token per "perfect week" (all tasks completed)
- Tokens tracked in TokenLedger with reasons (PERFECT_WEEK_EARNED, SIDE_CHALLENGE_STAKE, etc.)
- Tokens can be staked in side challenges
- Refunded on ties or voided challenges

### Side Challenges
- Head-to-head competitions between 2 participants
- 3 metric types: HIGHER_WINS, LOWER_WINS, TARGET_THRESHOLD
- Lifecycle: PROPOSED → ACCEPTED → OPEN → PENDING_REVIEW → RESOLVED
- Token stakes held until resolution, split on ties, refunded if voided

## Key Files

### Configuration
- `.env` - Environment variables (DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL)
- `prisma/schema.prisma` - Database schema
- `proxy.ts` - Middleware for route protection
- `app/globals.css` - Tailwind imports

### Core Libraries
- `lib/auth.ts` - Authentication helpers (bcryptjs, JWT)
- `lib/weeks.ts` - Week generation and lifecycle
- `lib/leaderboard.ts` - Leaderboard calculations with percentage-based prizes
- `lib/prisma.ts` - Prisma client singleton

### Key API Routes
- `/api/auth/*` - Login, register, logout, session
- `/api/challenges` - CRUD for challenges (includes DELETE with organizer check)
- `/api/challenges/[id]/weeks/[weekId]/admin/*` - Organizer admin features
- `/api/challenges/[id]/tokens/*` - Token balance and ledger
- `/api/cron/lock-weeks` - Week lifecycle automation

### Important Components
- `components/delete-challenge-button.tsx` - Hard confirmation modal (requires typing challenge name)
- `components/weekly-leaderboard.tsx` - Calculates prizes from percentages
- `components/token-balance.tsx` - Real-time token balance display
- `components/side-challenge-list.tsx` - Side challenge management

## Common Issues & Solutions

### 1. Styling Not Loading
**Problem**: Plain text, no styles in production
**Cause**: Using Tailwind v3 syntax with v4
**Solution**: Use `@import "tailwindcss"` in globals.css, not `@tailwind` directives

### 2. API Routes Return 405/Redirect
**Problem**: API calls getting redirected to /login
**Cause**: Middleware intercepting API routes
**Solution**: Update `proxy.ts` matcher to exclude `/api/*`:
```typescript
matcher: ["/((?!api|_next/static|_next/image|...).*"]
```

### 3. Prisma Schema Changes Not Reflecting
**Problem**: Database has old field names after schema update
**Cause**: Vercel still using old Prisma Client
**Solution**:
1. Run `npx prisma db push` locally
2. Commit and push code changes
3. Vercel will regenerate Prisma Client on deployment

### 4. Build Errors About Missing Fields
**Problem**: TypeScript errors about `weeklyPrizeAmount` not existing
**Cause**: Schema changed from amounts to percentages
**Solution**: Update all references to use `weeklyPrizePercent`, `grandPrizePercent`, `tokenChampPrizePercent`

## Development Workflow

1. **Making Schema Changes**:
   ```bash
   # Edit prisma/schema.prisma
   npx prisma db push
   npx prisma generate
   npm run build  # Test locally
   ```

2. **Committing Changes**:
   ```bash
   git add .
   git commit -m "Description

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   git push
   ```

3. **Using BEADS**:
   ```bash
   bd ready              # See available work
   bd create --title="Task" --type=task --priority=2
   bd update <id> --status=in_progress
   bd close <id>
   bd sync              # Sync with git at end of session
   ```

## Testing Checklist

Before pushing major changes:
- [ ] Run `npm run build` - must complete without errors
- [ ] Test authentication flow (register, login, logout)
- [ ] Create a test challenge with tasks
- [ ] Complete tasks and check leaderboards
- [ ] Test percentage calculations (prize pool preview)
- [ ] Test organizer admin features
- [ ] Test on mobile viewport

## Environment Variables Required

```bash
DATABASE_URL="postgresql://..."           # Neon PostgreSQL connection
JWT_SECRET="..."                          # openssl rand -base64 32
NEXT_PUBLIC_APP_URL="https://..."        # Production URL for redirects
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
```

## BEADS Status

All core features complete (9/9 tasks closed):
- ✅ Project setup & infrastructure
- ✅ Email + PIN authentication
- ✅ Challenge & task management
- ✅ Weekly completions & lifecycle
- ✅ Leaderboards & payout calculations
- ✅ Token system & perfect-week awards
- ✅ Side challenges (head-to-head)
- ✅ Organizer admin features
- ✅ Mobile-first UI polish

## Recent Session Work

### January 2025 Session
1. Fixed Tailwind CSS v4 syntax issue (app showing plain text)
2. Fixed authentication errors (middleware blocking API routes)
3. Improved logout UX (redirect with success message)
4. Converted prize structure from fixed amounts to percentages
5. Added challenge deletion with hard confirmation

All changes tested, committed, and deployed to production.

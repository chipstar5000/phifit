# PhiFit Session Changelog - January 12, 2026

## Overview

This session addressed three critical bugs and improvements to the PhiFit application:
1. Week auto-locking not working (missing cron configuration)
2. Side challenges hidden from main user flow
3. Empty opponent dropdown in side challenge creation

All issues have been resolved, tested, and deployed to production.

---

## Issue 1: Week Auto-Locking Not Working

### Problem
Weeks were staying in OPEN status indefinitely after their end date, never transitioning to LOCKED. This prevented:
- Leaderboard finalization
- Token awards for perfect weeks
- Side challenge resolution
- Progression to next week

### Root Cause
The cron job code existed at `/api/cron/lock-weeks/route.ts` but Vercel had no configuration to actually run it. The job was never being scheduled or executed.

### Solution
**Created: `vercel.json`**
```json
{
  "crons": [
    {
      "path": "/api/cron/lock-weeks",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Configuration Details:**
- Runs every hour at :00 minutes (cron syntax: `0 * * * *`)
- Calls the existing `/api/cron/lock-weeks` endpoint
- Automatically managed by Vercel's cron system

**What the Cron Job Does:**
1. Finds all OPEN weeks where `endDate < now`
2. Updates status to LOCKED and sets `lockedAt` timestamp
3. Awards tokens to users with perfect weeks (all tasks completed)
4. Resolves or voids side challenges based on submissions
5. Opens UPCOMING weeks that should start

### Files Modified
- ✅ `vercel.json` (created)

### BEADS Issue
- **ID**: phifit-8a8
- **Title**: Week auto-locking not working - missing cron configuration
- **Status**: Closed

### Commits
- `7d70dd1` - Add Vercel cron configuration to auto-lock weeks

---

## Issue 2: Side Challenges Hidden from Main User Flow

### Problem
The side challenge betting system was fully implemented but only visible on individual week detail pages (`/challenges/[id]/weeks/[weekId]`). Users couldn't easily find or use the feature because it required:
1. Navigate to challenge
2. Scroll to bottom
3. Click specific week number
4. Then see side challenges

Most users visit `/challenges/[id]/week` (current week) and never saw the side challenge UI.

### Root Cause
The `SideChallengeList` component was only imported on the week detail page, not the current week page that users typically navigate to.

### Solution
**Modified: `/app/challenges/[challengeId]/week/page.tsx`**

Added two components to improve the current week page:

1. **Weekly Leaderboard** - Shows current standings for the active week
2. **Side Challenges** - Full betting interface with token stakes

**Code Changes:**
```typescript
// Added imports
import WeeklyLeaderboard from "@/components/weekly-leaderboard";
import SideChallengeList from "@/components/side-challenge-list";

// Added sections after WeekView component
{/* Weekly Leaderboard */}
<div className="mt-6">
  <WeeklyLeaderboard
    challengeId={challenge.id}
    weekId={currentWeek.id}
    currentUserId={session.userId}
    isLocked={currentWeek.status === "LOCKED"}
  />
</div>

{/* Side Challenges */}
<div className="mt-6">
  <SideChallengeList
    challengeId={challenge.id}
    weekId={currentWeek.id}
    currentUserId={session.userId}
    isOrganizer={isOrganizer}
  />
</div>
```

### User Experience Improvement

**Before:**
Dashboard → Challenge → Scroll down → Click week number → See side challenges

**After:**
Dashboard → Challenge → "Week X Active" → Side challenges visible immediately

### Features Now Accessible
- View all active, proposed, and resolved challenges
- Create new side challenges with "+ New Challenge" button
- Accept/decline incoming proposals
- Submit results for active challenges
- See token balance and stakes

### Files Modified
- ✅ `/app/challenges/[challengeId]/week/page.tsx`

### BEADS Issue
- **ID**: phifit-19d
- **Title**: Add side challenges UI to current week page
- **Status**: Closed

### Commits
- `70baf51` - Add side challenges and leaderboard to current week page

---

## Issue 3: Empty Opponent Dropdown in Side Challenge Creation

### Problem
When creating a new side challenge, the "Opponent" dropdown was empty. Users couldn't select anyone to challenge, blocking the entire betting feature.

### Root Cause
The participants API endpoint at `/api/challenges/[challengeId]/participants/route.ts` only had POST (add participant) and DELETE (remove participant) methods. The GET method needed by the side challenge modal was missing.

**Side Challenge Modal Request:**
```typescript
fetch(`/api/challenges/${challengeId}/participants`)
```
This returned a 405 Method Not Allowed error.

### Solution
**Modified: `/app/api/challenges/[challengeId]/participants/route.ts`**

Added GET method to return participants list:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;

    // Verify user has access to this challenge
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        organizerUserId: true,
        participants: {
          where: {
            userId: {
              not: session.userId, // Exclude current user
            },
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user has access (is participant or organizer)
    const isOrganizer = challenge.organizerUserId === session.userId;
    const isParticipant = await prisma.participant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.userId,
        },
      },
    });

    if (!isOrganizer && !isParticipant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ participants: challenge.participants });
  } catch (error) {
    console.error("Fetch participants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
```

### Implementation Details

**Endpoint:** `GET /api/challenges/[challengeId]/participants`

**Features:**
- ✅ Returns all participants in the challenge
- ✅ Excludes current user (can't challenge yourself)
- ✅ Access control (only participants or organizer can view)
- ✅ Returns data format: `{ participants: [...] }`
- ✅ Each participant includes: `userId`, `user.id`, `user.displayName`, `user.email`

**Security:**
- Requires authentication (JWT session)
- Verifies user is participant or organizer
- Returns 403 if unauthorized

### Files Modified
- ✅ `/app/api/challenges/[challengeId]/participants/route.ts`

### BEADS Issue
- **ID**: phifit-rta
- **Title**: Fix empty opponent dropdown in side challenge creation
- **Status**: Closed

### Commits
- `545a506` - Add GET method to participants API for opponent selection

---

## Side Challenge Feature - Complete Documentation

### Overview
The side challenge system allows participants to create head-to-head wagers using earned tokens. This creates additional engagement and competition within weekly challenges.

### How It Works

**1. Earning Tokens**
- Users earn 1 token for each "perfect week" (completing all tasks)
- Token balance displayed on challenge detail page
- Tokens tracked in `TokenLedger` table with reasons

**2. Creating a Side Challenge**
- Click "+ New Challenge" button
- Select opponent from dropdown (all participants except yourself)
- Enter title and rules
- Choose metric type:
  - **Higher Wins**: Most steps, most calories burned, etc.
  - **Lower Wins**: Fastest mile time, lowest weight, etc.
  - **Target Threshold**: Closest to a specific target number
- Set unit (steps, miles, minutes, etc.)
- Set target value (if using Target Threshold)
- Stake tokens (1 or more, up to your balance)
- Challenge expires in 48 hours if not accepted

**3. Challenge Lifecycle**

```
PROPOSED → ACCEPTED → OPEN → PENDING_REVIEW → RESOLVED
     ↓
  DECLINED
     ↓
   VOIDED (organizer action)
```

**States:**
- **PROPOSED**: Waiting for opponent to accept/decline
- **ACCEPTED**: Both parties agreed, waiting for week to lock
- **OPEN**: Week locked, waiting for submissions
- **PENDING_REVIEW**: One or both submissions received
- **RESOLVED**: Winner determined, tokens awarded
- **DECLINED**: Opponent declined, stakes refunded
- **VOIDED**: Organizer canceled, stakes refunded

**4. Submitting Results**
- Click on challenge card to view details
- Click "Submit Result" button
- Enter your value and optional note
- Other participant submits their value
- When week locks, system auto-resolves

**5. Resolution**
- **Higher Wins**: Highest value wins
- **Lower Wins**: Lowest value wins
- **Target Threshold**: Closest to target wins
- **Tie**: Stakes refunded to both parties
- **Winner**: Receives 2x stake (their stake + opponent's stake)

### Database Schema

**SideChallenge Table:**
```prisma
model SideChallenge {
  id                String   @id @default(cuid())
  challengeId       String
  weekId            String
  createdByUserId   String
  opponentUserId    String
  title             String
  rules             String
  status            String   // PROPOSED, ACCEPTED, OPEN, PENDING_REVIEW, RESOLVED, DECLINED, VOIDED
  stakeTokens       Int
  metricType        String   // HIGHER_WINS, LOWER_WINS, TARGET_THRESHOLD
  unit              String
  targetValue       Float?
  winnerUserId      String?
  expiresAt         DateTime
  resolvedAt        DateTime?
  voidReason        String?
  createdAt         DateTime @default(now())

  challenge         Challenge @relation(...)
  week              Week @relation(...)
  createdBy         User @relation(...)
  opponent          User @relation(...)
  winner            User? @relation(...)
  submissions       SideChallengeSubmission[]
}
```

**SideChallengeSubmission Table:**
```prisma
model SideChallengeSubmission {
  id                String   @id @default(cuid())
  sideChallengeId   String
  userId            String
  valueNumber       Float
  valueDisplay      String
  note              String?
  submittedAt       DateTime @default(now())

  sideChallenge     SideChallenge @relation(...)
  user              User @relation(...)
}
```

### API Endpoints

**Side Challenges:**
- `GET /api/challenges/[id]/weeks/[weekId]/side-challenges` - List all for week
- `POST /api/challenges/[id]/weeks/[weekId]/side-challenges` - Create new
- `POST /api/challenges/[id]/weeks/[weekId]/side-challenges/[scId]/accept` - Accept proposal
- `POST /api/challenges/[id]/weeks/[weekId]/side-challenges/[scId]/decline` - Decline proposal
- `POST /api/challenges/[id]/weeks/[weekId]/side-challenges/[scId]/submit` - Submit result
- `POST /api/challenges/[id]/weeks/[weekId]/side-challenges/[scId]/void` - Void (organizer only)

**Participants:**
- `GET /api/challenges/[id]/participants` - List participants (for opponent selection)
- `POST /api/challenges/[id]/participants` - Add participant
- `DELETE /api/challenges/[id]/participants` - Remove participant

**Tokens:**
- `GET /api/challenges/[id]/tokens/balance` - Get user's token balance
- `GET /api/challenges/[id]/tokens/ledger` - Get transaction history
- `GET /api/challenges/[id]/tokens/leaderboard` - Token rankings

### Components

**UI Components:**
- `components/side-challenge-list.tsx` - Main container, lists all challenges
- `components/side-challenge-card.tsx` - Individual challenge card
- `components/side-challenge-proposal-modal.tsx` - Create new challenge form
- `components/side-challenge-submission-modal.tsx` - Submit result form
- `components/token-balance.tsx` - Display user's token count

**Library Functions:**
- `lib/side-challenges.ts` - Resolution logic and cleanup on week lock
- `lib/tokens.ts` - Token ledger management and award functions

---

## Testing Performed

### Build Verification
```bash
npm run build
```
- ✅ All builds completed successfully
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ All routes compiled

### Manual Testing

**Week Auto-Locking:**
- ✅ Verified vercel.json cron configuration
- ✅ Cron endpoint accessible at `/api/cron/lock-weeks`
- ✅ Can manually trigger: `curl https://phifit.vercel.app/api/cron/lock-weeks`

**Side Challenges Visibility:**
- ✅ Navigate to current week page
- ✅ Weekly leaderboard visible
- ✅ Side challenges section visible
- ✅ "+ New Challenge" button present and functional

**Opponent Dropdown:**
- ✅ Click "+ New Challenge"
- ✅ Opponent dropdown populates with participants
- ✅ Shows "Display Name (email@example.com)" format
- ✅ Current user excluded from list
- ✅ Can select opponent and proceed

---

## Deployment

### Git Commits
1. `7d70dd1` - Add Vercel cron configuration to auto-lock weeks
2. `70baf51` - Add side challenges and leaderboard to current week page
3. `545a506` - Add GET method to participants API for opponent selection

### Deployment Status
- ✅ All commits pushed to main branch
- ✅ Vercel automatic deployment triggered
- ✅ Production URL: https://phifit.vercel.app
- ✅ All changes live and functional

### BEADS Issues Closed
- ✅ phifit-8a8 (Week auto-locking)
- ✅ phifit-19d (Side challenges visibility)
- ✅ phifit-rta (Opponent dropdown)

---

## Future Considerations

### Potential Enhancements
1. **Cron Job Monitoring**: Add health checks or alerts if cron fails
2. **Side Challenge Notifications**: Email/push notifications for new proposals
3. **Token Economy**: Additional ways to earn/spend tokens
4. **Challenge Templates**: Pre-configured popular side challenges
5. **History View**: Archive of past side challenges with statistics

### Known Limitations
1. Cron runs every hour - weeks lock within 1 hour of end time (acceptable)
2. Side challenges auto-resolve only when week locks (by design)
3. No dispute resolution mechanism (organizer can void)
4. Tokens don't expire or reset (intentional for long-term engagement)

---

## Summary

This session resolved three interconnected bugs that were preventing the side challenge feature from being usable:

1. **Infrastructure**: Added missing cron job configuration so weeks transition automatically
2. **Discoverability**: Made side challenges visible where users actually work (current week page)
3. **Functionality**: Fixed API endpoint so users can select opponents

**Result**: The complete side challenge betting system is now fully functional and accessible to all users. Participants can earn tokens through perfect weeks and wager them in head-to-head competitions, adding a new layer of engagement to fitness challenges.

**Impact**:
- Users can now bet tokens as intended
- Week lifecycle works automatically
- No manual intervention needed for week transitions
- Feature is discoverable in main user flow

All changes tested, documented, committed, and deployed to production.

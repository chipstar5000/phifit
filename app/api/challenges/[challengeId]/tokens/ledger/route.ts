import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyParticipantAccess, verifyOrganizer } from "@/lib/authorization";
import { getTokenBalance, getTokenLedger } from "@/lib/tokens";

/**
 * GET /api/challenges/[challengeId]/tokens/ledger?userId=xxx
 * Returns the token transaction ledger
 * - If no userId provided: returns current user's ledger
 * - If userId provided: organizers can view any participant's ledger
 */
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
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // Determine which user's ledger to fetch
    const targetUserId = requestedUserId || session.userId;

    // If requesting another user's ledger, must be organizer
    if (requestedUserId && requestedUserId !== session.userId) {
      const isOrganizer = await verifyOrganizer(challengeId, session.userId);
      if (!isOrganizer) {
        return NextResponse.json(
          { error: "Only organizers can view other participants' ledgers" },
          { status: 403 }
        );
      }
    } else {
      // Verify user is a participant in this challenge
      const hasAccess = await verifyParticipantAccess(challengeId, targetUserId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "You must be a participant in this challenge" },
          { status: 403 }
        );
      }
    }

    // Get ledger entries and current balance
    const [entries, balance] = await Promise.all([
      getTokenLedger(challengeId, targetUserId),
      getTokenBalance(challengeId, targetUserId),
    ]);

    return NextResponse.json({
      entries,
      balance,
      userId: targetUserId,
    });
  } catch (error) {
    console.error("Get token ledger error:", error);
    return NextResponse.json(
      { error: "Failed to get token ledger" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyParticipantAccess } from "@/lib/authorization";
import { getTopTokenHolders } from "@/lib/tokens";

/**
 * GET /api/challenges/[challengeId]/tokens/leaderboard
 * Returns the token leaderboard for a challenge
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

    // Verify user is a participant in this challenge
    const hasAccess = await verifyParticipantAccess(challengeId, session.userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You must be a participant in this challenge" },
        { status: 403 }
      );
    }

    // Get top token holders (no limit, return all)
    const leaderboard = await getTopTokenHolders(challengeId, 1000);

    return NextResponse.json({
      leaderboard,
      currentUserId: session.userId,
    });
  } catch (error) {
    console.error("Get token leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to get token leaderboard" },
      { status: 500 }
    );
  }
}

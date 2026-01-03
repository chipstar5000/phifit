import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyParticipantAccess } from "@/lib/authorization";
import { getTokenBalance } from "@/lib/tokens";

/**
 * GET /api/challenges/[challengeId]/tokens/balance
 * Returns the token balance for the current user in the challenge
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

    // Get token balance
    const balance = await getTokenBalance(challengeId, session.userId);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Get token balance error:", error);
    return NextResponse.json(
      { error: "Failed to get token balance" },
      { status: 500 }
    );
  }
}

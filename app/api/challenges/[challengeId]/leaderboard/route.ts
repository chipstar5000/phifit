import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getOverallLeaderboard,
  getPayoutSummary,
  getOverallWinners,
} from "@/lib/leaderboard";

// GET /api/challenges/[challengeId]/leaderboard - Overall leaderboard
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

    // Verify access
    const participant = await prisma.participant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [leaderboard, payoutSummary, challenge] = await Promise.all([
      getOverallLeaderboard(challengeId),
      getPayoutSummary(challengeId),
      prisma.challenge.findUnique({
        where: { id: challengeId },
        select: {
          status: true,
        },
      }),
    ]);

    const winners =
      challenge && payoutSummary.grandPrize > 0
        ? await getOverallWinners(challengeId, payoutSummary.grandPrize)
        : [];

    return NextResponse.json({
      leaderboard,
      payoutSummary,
      winners,
      challengeStatus: challenge?.status,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

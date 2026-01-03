import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSideChallengeById,
  voidSideChallengeTokens,
} from "@/lib/side-challenges";

/**
 * POST /api/challenges/[challengeId]/weeks/[weekId]/side-challenges/[sideChallengeId]/decline
 * Decline a proposed side challenge
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      challengeId: string;
      weekId: string;
      sideChallengeId: string;
    }>;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, weekId, sideChallengeId } = await params;

    // Get side challenge
    const sideChallenge = await getSideChallengeById(sideChallengeId);
    if (!sideChallenge) {
      return NextResponse.json(
        { error: "Side challenge not found" },
        { status: 404 }
      );
    }

    // Verify user is the opponent
    if (sideChallenge.opponentUserId !== session.userId) {
      return NextResponse.json(
        { error: "Only the opponent can decline this challenge" },
        { status: 403 }
      );
    }

    // Verify status is PROPOSED
    if (sideChallenge.status !== "PROPOSED") {
      return NextResponse.json(
        { error: "Challenge has already been responded to" },
        { status: 400 }
      );
    }

    // Decline challenge and refund creator's tokens in transaction
    const updatedChallenge = await prisma.$transaction(async (tx) => {
      // Update challenge status
      const challenge = await tx.sideChallenge.update({
        where: { id: sideChallengeId },
        data: {
          status: "DECLINED",
          resolutionNote: "Declined by opponent",
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
          opponent: {
            select: { id: true, displayName: true, email: true },
          },
          submissions: {
            include: {
              user: {
                select: { displayName: true },
              },
            },
          },
        },
      });

      // Refund creator's staked tokens (was not accepted, so only refund creator)
      await voidSideChallengeTokens(
        tx,
        challengeId,
        weekId,
        sideChallengeId,
        sideChallenge.createdByUserId,
        sideChallenge.opponentUserId,
        sideChallenge.stakeTokens,
        false // wasAccepted = false
      );

      return challenge;
    });

    return NextResponse.json({ sideChallenge: updatedChallenge });
  } catch (error) {
    console.error("Decline side challenge error:", error);
    return NextResponse.json(
      { error: "Failed to decline side challenge" },
      { status: 500 }
    );
  }
}

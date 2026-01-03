import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  getSideChallengeById,
  voidSideChallengeTokens,
} from "@/lib/side-challenges";

/**
 * POST /api/challenges/[challengeId]/weeks/[weekId]/side-challenges/[sideChallengeId]/void
 * Void a side challenge (organizer only)
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
    const body = await request.json();

    const { reason } = body;

    // Validate reason is provided
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Void reason is required" },
        { status: 400 }
      );
    }

    // Verify user is organizer
    const isOrganizer = await verifyOrganizer(challengeId, session.userId);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Only organizers can void challenges" },
        { status: 403 }
      );
    }

    // Get side challenge
    const sideChallenge = await getSideChallengeById(sideChallengeId);
    if (!sideChallenge) {
      return NextResponse.json(
        { error: "Side challenge not found" },
        { status: 404 }
      );
    }

    // Verify not already resolved or voided
    if (sideChallenge.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Cannot void a resolved challenge" },
        { status: 400 }
      );
    }

    if (sideChallenge.status === "VOID") {
      return NextResponse.json(
        { error: "Challenge is already voided" },
        { status: 400 }
      );
    }

    if (sideChallenge.status === "DECLINED") {
      return NextResponse.json(
        { error: "Challenge was already declined" },
        { status: 400 }
      );
    }

    // Determine if challenge was accepted (to know if opponent staked tokens)
    const wasAccepted =
      sideChallenge.status === "ACCEPTED" ||
      sideChallenge.status === "PENDING_REVIEW";

    // Void challenge and refund tokens in transaction
    const updatedChallenge = await prisma.$transaction(async (tx) => {
      // Update challenge status
      const challenge = await tx.sideChallenge.update({
        where: { id: sideChallengeId },
        data: {
          status: "VOID",
          resolutionNote: `Voided by organizer: ${reason}`,
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

      // Refund staked tokens
      await voidSideChallengeTokens(
        tx,
        challengeId,
        weekId,
        sideChallengeId,
        sideChallenge.createdByUserId,
        sideChallenge.opponentUserId,
        sideChallenge.stakeTokens,
        wasAccepted
      );

      return challenge;
    });

    return NextResponse.json({ sideChallenge: updatedChallenge });
  } catch (error) {
    console.error("Void side challenge error:", error);
    return NextResponse.json(
      { error: "Failed to void side challenge" },
      { status: 500 }
    );
  }
}

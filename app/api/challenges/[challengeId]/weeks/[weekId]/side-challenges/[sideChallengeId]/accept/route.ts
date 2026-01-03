import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSideChallengeById,
  validateUserCanStake,
  stakeSideChallengeTokens,
} from "@/lib/side-challenges";

/**
 * POST /api/challenges/[challengeId]/weeks/[weekId]/side-challenges/[sideChallengeId]/accept
 * Accept a proposed side challenge
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
        { error: "Only the opponent can accept this challenge" },
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

    // Check if proposal has expired
    if (new Date() > sideChallenge.expiresAt) {
      return NextResponse.json(
        { error: "Challenge proposal has expired" },
        { status: 400 }
      );
    }

    // Validate opponent has sufficient tokens
    const stakeValidation = await validateUserCanStake(
      challengeId,
      session.userId,
      sideChallenge.stakeTokens
    );
    if (!stakeValidation.valid) {
      return NextResponse.json(
        { error: stakeValidation.error },
        { status: 400 }
      );
    }

    // Accept challenge and stake opponent's tokens in transaction
    const updatedChallenge = await prisma.$transaction(async (tx) => {
      // Update challenge status
      const challenge = await tx.sideChallenge.update({
        where: { id: sideChallengeId },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
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

      // Stake opponent's tokens
      await stakeSideChallengeTokens(
        tx,
        challengeId,
        weekId,
        sideChallengeId,
        session.userId,
        sideChallenge.stakeTokens
      );

      return challenge;
    });

    return NextResponse.json({ sideChallenge: updatedChallenge });
  } catch (error) {
    console.error("Accept side challenge error:", error);
    return NextResponse.json(
      { error: "Failed to accept side challenge" },
      { status: 500 }
    );
  }
}

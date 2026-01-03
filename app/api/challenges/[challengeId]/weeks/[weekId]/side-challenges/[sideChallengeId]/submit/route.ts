import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSideChallengeById,
  hasUserSubmitted,
  calculateWinner,
  resolveSideChallengeTokens,
} from "@/lib/side-challenges";

/**
 * POST /api/challenges/[challengeId]/weeks/[weekId]/side-challenges/[sideChallengeId]/submit
 * Submit result for side challenge
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

    const { valueNumber, valueDisplay, note } = body;

    // Validate required fields
    if (valueNumber === null || valueNumber === undefined) {
      return NextResponse.json(
        { error: "Value is required" },
        { status: 400 }
      );
    }

    if (typeof valueNumber !== "number" || valueNumber < 0) {
      return NextResponse.json(
        { error: "Value must be a non-negative number" },
        { status: 400 }
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

    // Verify user is creator or opponent
    const isParticipant =
      sideChallenge.createdByUserId === session.userId ||
      sideChallenge.opponentUserId === session.userId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this challenge" },
        { status: 403 }
      );
    }

    // Verify status is ACCEPTED
    if (sideChallenge.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Challenge must be accepted before submitting results" },
        { status: 400 }
      );
    }

    // Check if user has already submitted
    const alreadySubmitted = await hasUserSubmitted(
      sideChallengeId,
      session.userId
    );
    if (alreadySubmitted) {
      return NextResponse.json(
        { error: "You have already submitted your result" },
        { status: 400 }
      );
    }

    // Create submission and check for auto-resolution in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create submission
      const submission = await tx.sideChallengeSubmission.create({
        data: {
          sideChallengeId,
          userId: session.userId,
          valueNumber,
          valueDisplay: valueDisplay || `${valueNumber} ${sideChallenge.unit}`,
          note: note || null,
        },
        include: {
          user: {
            select: { displayName: true },
          },
        },
      });

      // Check if both participants have now submitted
      const allSubmissions = await tx.sideChallengeSubmission.findMany({
        where: { sideChallengeId },
        select: { userId: true, valueNumber: true },
      });

      let updatedChallenge = null;
      let resolution = null;

      if (allSubmissions.length === 2) {
        // Both submitted - auto-resolve
        const creatorSubmission = allSubmissions.find(
          (s) => s.userId === sideChallenge.createdByUserId
        );
        const opponentSubmission = allSubmissions.find(
          (s) => s.userId === sideChallenge.opponentUserId
        );

        if (creatorSubmission && opponentSubmission) {
          // Calculate winner
          resolution = calculateWinner(
            sideChallenge.metricType,
            sideChallenge.targetValue,
            Number(creatorSubmission.valueNumber),
            Number(opponentSubmission.valueNumber),
            sideChallenge.createdByUserId,
            sideChallenge.opponentUserId
          );

          // Update challenge to RESOLVED
          updatedChallenge = await tx.sideChallenge.update({
            where: { id: sideChallengeId },
            data: {
              status: "RESOLVED",
              winnerUserId: resolution.winnerUserId,
              resolvedAt: new Date(),
              resolutionNote: `Auto-resolved: ${resolution.reason}`,
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

          // Award tokens
          await resolveSideChallengeTokens(
            tx,
            challengeId,
            weekId,
            sideChallengeId,
            resolution.winnerUserId,
            sideChallenge.createdByUserId,
            sideChallenge.opponentUserId,
            sideChallenge.stakeTokens
          );
        }
      } else {
        // Only one submission so far - update to PENDING_REVIEW
        // Actually, we should only set to PENDING_REVIEW when second submission comes in
        // For now, keep as ACCEPTED
      }

      return {
        submission,
        sideChallenge: updatedChallenge || sideChallenge,
        resolved: allSubmissions.length === 2,
        resolution,
      };
    });

    return NextResponse.json({
      submission: result.submission,
      sideChallenge: result.sideChallenge,
      resolved: result.resolved,
      resolution: result.resolution,
    });
  } catch (error) {
    console.error("Submit side challenge result error:", error);
    return NextResponse.json(
      { error: "Failed to submit result" },
      { status: 500 }
    );
  }
}

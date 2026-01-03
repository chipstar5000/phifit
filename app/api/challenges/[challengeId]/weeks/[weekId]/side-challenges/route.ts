import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyParticipantAccess } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  getSideChallengesForWeek,
  validateUserCanStake,
  validateWeekForSideChallenge,
  stakeSideChallengeTokens,
} from "@/lib/side-challenges";

/**
 * GET /api/challenges/[challengeId]/weeks/[weekId]/side-challenges
 * List side challenges for a week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; weekId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, weekId } = await params;

    // Verify user is participant
    const hasAccess = await verifyParticipantAccess(challengeId, session.userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You must be a participant in this challenge" },
        { status: 403 }
      );
    }

    // Get side challenges (user's challenges only)
    const sideChallenges = await getSideChallengesForWeek(
      challengeId,
      weekId,
      session.userId
    );

    return NextResponse.json({ sideChallenges });
  } catch (error) {
    console.error("Get side challenges error:", error);
    return NextResponse.json(
      { error: "Failed to get side challenges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/challenges/[challengeId]/weeks/[weekId]/side-challenges
 * Create new side challenge proposal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; weekId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, weekId } = await params;
    const body = await request.json();

    const {
      opponentUserId,
      title,
      rules,
      metricType,
      unit,
      targetValue,
      stakeTokens,
      expiresAt,
    } = body;

    // Validate required fields
    if (!opponentUserId || !title || !rules || !metricType || !unit || !stakeTokens) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate metric type
    if (!["HIGHER_WINS", "LOWER_WINS", "TARGET_THRESHOLD"].includes(metricType)) {
      return NextResponse.json({ error: "Invalid metric type" }, { status: 400 });
    }

    // Validate target value for TARGET_THRESHOLD
    if (metricType === "TARGET_THRESHOLD" && (targetValue === null || targetValue === undefined)) {
      return NextResponse.json(
        { error: "Target value required for TARGET_THRESHOLD metric type" },
        { status: 400 }
      );
    }

    // Verify user is participant
    const hasAccess = await verifyParticipantAccess(challengeId, session.userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You must be a participant in this challenge" },
        { status: 403 }
      );
    }

    // Validate cannot challenge self
    if (opponentUserId === session.userId) {
      return NextResponse.json(
        { error: "Cannot challenge yourself" },
        { status: 400 }
      );
    }

    // Verify opponent is participant
    const opponentIsParticipant = await verifyParticipantAccess(
      challengeId,
      opponentUserId
    );
    if (!opponentIsParticipant) {
      return NextResponse.json(
        { error: "Opponent must be a participant in this challenge" },
        { status: 400 }
      );
    }

    // Validate week status
    const weekValidation = await validateWeekForSideChallenge(weekId);
    if (!weekValidation.valid) {
      return NextResponse.json(
        { error: weekValidation.error },
        { status: 400 }
      );
    }

    // Validate creator has sufficient tokens
    const stakeValidation = await validateUserCanStake(
      challengeId,
      session.userId,
      stakeTokens
    );
    if (!stakeValidation.valid) {
      return NextResponse.json(
        { error: stakeValidation.error },
        { status: 400 }
      );
    }

    // Check for duplicate active challenge between same users in same week
    const existingChallenge = await prisma.sideChallenge.findFirst({
      where: {
        challengeId,
        weekId,
        status: {
          in: ["PROPOSED", "ACCEPTED", "PENDING_REVIEW"],
        },
        OR: [
          {
            createdByUserId: session.userId,
            opponentUserId: opponentUserId,
          },
          {
            createdByUserId: opponentUserId,
            opponentUserId: session.userId,
          },
        ],
      },
    });

    if (existingChallenge) {
      return NextResponse.json(
        {
          error:
            "You already have an active challenge with this participant this week",
        },
        { status: 400 }
      );
    }

    // Set default expiration (48 hours from now) if not provided
    const expirationDate = expiresAt
      ? new Date(expiresAt)
      : new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create side challenge and stake tokens in transaction
    const sideChallenge = await prisma.$transaction(async (tx) => {
      // Create the side challenge
      const challenge = await tx.sideChallenge.create({
        data: {
          challengeId,
          weekId,
          createdByUserId: session.userId,
          opponentUserId,
          title,
          rules,
          metricType,
          unit,
          targetValue: targetValue !== null && targetValue !== undefined ? targetValue : null,
          stakeTokens,
          status: "PROPOSED",
          expiresAt: expirationDate,
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

      // Stake creator's tokens
      await stakeSideChallengeTokens(
        tx,
        challengeId,
        weekId,
        challenge.id,
        session.userId,
        stakeTokens
      );

      return challenge;
    });

    return NextResponse.json({ sideChallenge }, { status: 201 });
  } catch (error) {
    console.error("Create side challenge error:", error);
    return NextResponse.json(
      { error: "Failed to create side challenge" },
      { status: 500 }
    );
  }
}

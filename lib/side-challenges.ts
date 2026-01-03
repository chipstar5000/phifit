import { prisma } from "./prisma";
import { getTokenBalance } from "./tokens";

/**
 * Side challenge business logic and token transaction management
 * Handles proposals, acceptance, submissions, and resolution with atomic token operations
 */

export interface SideChallengeWithDetails {
  id: string;
  challengeId: string;
  weekId: string;
  createdByUserId: string;
  opponentUserId: string;
  status: string;
  title: string;
  rules: string;
  metricType: string;
  unit: string;
  targetValue: number | null;
  stakeTokens: number;
  createdAt: Date;
  acceptedAt: Date | null;
  expiresAt: Date;
  resolvedAt: Date | null;
  winnerUserId: string | null;
  resolutionNote: string | null;
  createdBy: { id: string; displayName: string; email: string };
  opponent: { id: string; displayName: string; email: string };
  submissions: Array<{
    id: string;
    userId: string;
    valueNumber: number;
    valueDisplay: string;
    note: string | null;
    submittedAt: Date;
    user: { displayName: string };
  }>;
}

export interface WinnerCalculation {
  winnerId: "creator" | "opponent" | "tie";
  reason: string;
  winnerUserId: string | null;
}

/**
 * Get user's token balance for a challenge
 */
export async function getUserBalanceForChallenge(
  challengeId: string,
  userId: string
): Promise<number> {
  return await getTokenBalance(challengeId, userId);
}

/**
 * Get available token balance (total balance minus staked tokens)
 */
export async function getAvailableBalance(
  challengeId: string,
  userId: string
): Promise<{ total: number; available: number; staked: number }> {
  const total = await getTokenBalance(challengeId, userId);

  // Calculate staked tokens from active side challenges
  const stakedChallenges = await prisma.sideChallenge.findMany({
    where: {
      challengeId,
      OR: [{ createdByUserId: userId }, { opponentUserId: userId }],
      status: {
        in: ["PROPOSED", "ACCEPTED", "PENDING_REVIEW"],
      },
    },
    select: { stakeTokens: true, createdByUserId: true, status: true },
  });

  let staked = 0;
  stakedChallenges.forEach((challenge) => {
    // Creator stakes immediately on proposal
    if (challenge.createdByUserId === userId) {
      staked += challenge.stakeTokens;
    }
    // Opponent stakes only after accepting
    else if (challenge.status === "ACCEPTED" || challenge.status === "PENDING_REVIEW") {
      staked += challenge.stakeTokens;
    }
  });

  return {
    total,
    available: total - staked,
    staked,
  };
}

/**
 * Stake tokens for a side challenge (used within transaction)
 */
export async function stakeSideChallengeTokens(
  tx: any,
  challengeId: string,
  weekId: string,
  sideChallengeId: string,
  userId: string,
  amount: number
): Promise<void> {
  await tx.tokenLedger.create({
    data: {
      challengeId,
      userId,
      weekId,
      delta: -amount,
      reason: "SIDE_CHALLENGE_STAKE",
      relatedEntityId: sideChallengeId,
    },
  });
}

/**
 * Calculate winner based on metric type and submission values
 */
export function calculateWinner(
  metricType: string,
  targetValue: number | null,
  creatorValue: number,
  opponentValue: number,
  creatorUserId: string,
  opponentUserId: string
): WinnerCalculation {
  let winnerId: "creator" | "opponent" | "tie";
  let reason: string;
  let winnerUserId: string | null = null;

  if (metricType === "HIGHER_WINS") {
    if (creatorValue > opponentValue) {
      winnerId = "creator";
      winnerUserId = creatorUserId;
      reason = `Higher value wins: ${creatorValue} > ${opponentValue}`;
    } else if (opponentValue > creatorValue) {
      winnerId = "opponent";
      winnerUserId = opponentUserId;
      reason = `Higher value wins: ${opponentValue} > ${creatorValue}`;
    } else {
      winnerId = "tie";
      reason = `Tie: Both achieved ${creatorValue}`;
    }
  } else if (metricType === "LOWER_WINS") {
    if (creatorValue < opponentValue) {
      winnerId = "creator";
      winnerUserId = creatorUserId;
      reason = `Lower value wins: ${creatorValue} < ${opponentValue}`;
    } else if (opponentValue < creatorValue) {
      winnerId = "opponent";
      winnerUserId = opponentUserId;
      reason = `Lower value wins: ${opponentValue} < ${creatorValue}`;
    } else {
      winnerId = "tie";
      reason = `Tie: Both achieved ${creatorValue}`;
    }
  } else if (metricType === "TARGET_THRESHOLD") {
    if (targetValue === null) {
      throw new Error("Target value required for TARGET_THRESHOLD metric type");
    }

    const creatorDistance = Math.abs(creatorValue - targetValue);
    const opponentDistance = Math.abs(opponentValue - targetValue);

    if (creatorDistance < opponentDistance) {
      winnerId = "creator";
      winnerUserId = creatorUserId;
      reason = `Closest to target ${targetValue}: Creator ${creatorValue} (distance ${creatorDistance}) vs Opponent ${opponentValue} (distance ${opponentDistance})`;
    } else if (opponentDistance < creatorDistance) {
      winnerId = "opponent";
      winnerUserId = opponentUserId;
      reason = `Closest to target ${targetValue}: Opponent ${opponentValue} (distance ${opponentDistance}) vs Creator ${creatorValue} (distance ${creatorDistance})`;
    } else {
      winnerId = "tie";
      reason = `Tie: Both equally distant from target ${targetValue}`;
    }
  } else {
    throw new Error(`Unknown metric type: ${metricType}`);
  }

  return { winnerId, reason, winnerUserId };
}

/**
 * Resolve side challenge tokens (used within transaction)
 * Awards winner or refunds on tie
 */
export async function resolveSideChallengeTokens(
  tx: any,
  challengeId: string,
  weekId: string,
  sideChallengeId: string,
  winnerId: string | null,
  creatorUserId: string,
  opponentUserId: string,
  stakeAmount: number
): Promise<void> {
  if (winnerId === null) {
    // Tie - refund both participants
    await tx.tokenLedger.createMany({
      data: [
        {
          challengeId,
          userId: creatorUserId,
          weekId,
          delta: stakeAmount,
          reason: "SIDE_CHALLENGE_TIE_REFUND",
          relatedEntityId: sideChallengeId,
        },
        {
          challengeId,
          userId: opponentUserId,
          weekId,
          delta: stakeAmount,
          reason: "SIDE_CHALLENGE_TIE_REFUND",
          relatedEntityId: sideChallengeId,
        },
      ],
    });
  } else {
    // Winner takes all
    await tx.tokenLedger.create({
      data: {
        challengeId,
        userId: winnerId,
        weekId,
        delta: stakeAmount * 2,
        reason: "SIDE_CHALLENGE_WIN",
        relatedEntityId: sideChallengeId,
      },
    });
  }
}

/**
 * Void side challenge and refund staked tokens (used within transaction)
 */
export async function voidSideChallengeTokens(
  tx: any,
  challengeId: string,
  weekId: string,
  sideChallengeId: string,
  creatorUserId: string,
  opponentUserId: string,
  stakeAmount: number,
  wasAccepted: boolean
): Promise<void> {
  const refunds = [
    {
      challengeId,
      userId: creatorUserId,
      weekId,
      delta: stakeAmount,
      reason: "SIDE_CHALLENGE_VOID_REFUND" as const,
      relatedEntityId: sideChallengeId,
    },
  ];

  // Refund opponent only if challenge was accepted
  if (wasAccepted) {
    refunds.push({
      challengeId,
      userId: opponentUserId,
      weekId,
      delta: stakeAmount,
      reason: "SIDE_CHALLENGE_VOID_REFUND" as const,
      relatedEntityId: sideChallengeId,
    });
  }

  await tx.tokenLedger.createMany({ data: refunds });
}

/**
 * Get side challenges for a week
 */
export async function getSideChallengesForWeek(
  challengeId: string,
  weekId: string,
  userId?: string
): Promise<SideChallengeWithDetails[]> {
  const where: any = {
    challengeId,
    weekId,
  };

  if (userId) {
    where.OR = [{ createdByUserId: userId }, { opponentUserId: userId }];
  }

  const challenges = await prisma.sideChallenge.findMany({
    where,
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
        orderBy: { submittedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return challenges.map((c) => ({
    ...c,
    targetValue: c.targetValue ? Number(c.targetValue) : null,
    submissions: c.submissions.map((s) => ({
      ...s,
      valueNumber: Number(s.valueNumber),
    })),
  }));
}

/**
 * Get single side challenge with details
 */
export async function getSideChallengeById(
  sideChallengeId: string
): Promise<SideChallengeWithDetails | null> {
  const challenge = await prisma.sideChallenge.findUnique({
    where: { id: sideChallengeId },
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
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!challenge) return null;

  return {
    ...challenge,
    targetValue: challenge.targetValue ? Number(challenge.targetValue) : null,
    submissions: challenge.submissions.map((s) => ({
      ...s,
      valueNumber: Number(s.valueNumber),
    })),
  };
}

/**
 * Validate user can stake tokens for a side challenge
 */
export async function validateUserCanStake(
  challengeId: string,
  userId: string,
  stakeAmount: number
): Promise<{ valid: boolean; error?: string }> {
  if (stakeAmount <= 0) {
    return { valid: false, error: "Stake amount must be greater than 0" };
  }

  const balance = await getAvailableBalance(challengeId, userId);

  if (balance.available < stakeAmount) {
    return {
      valid: false,
      error: `Insufficient tokens. You have ${balance.available} available (${balance.staked} staked in other challenges)`,
    };
  }

  return { valid: true };
}

/**
 * Validate week is eligible for side challenges
 */
export async function validateWeekForSideChallenge(
  weekId: string
): Promise<{ valid: boolean; error?: string }> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    select: { status: true },
  });

  if (!week) {
    return { valid: false, error: "Week not found" };
  }

  if (week.status === "LOCKED") {
    return {
      valid: false,
      error: "Cannot create side challenges for locked weeks",
    };
  }

  return { valid: true };
}

/**
 * Check if user has already submitted for a side challenge
 */
export async function hasUserSubmitted(
  sideChallengeId: string,
  userId: string
): Promise<boolean> {
  const submission = await prisma.sideChallengeSubmission.findUnique({
    where: {
      sideChallengeId_userId: {
        sideChallengeId,
        userId,
      },
    },
  });

  return submission !== null;
}

/**
 * Auto-resolve side challenges when week locks
 * Resolves PENDING_REVIEW, voids PROPOSED and incomplete ACCEPTED
 */
export async function cleanupSideChallengesOnWeekLock(
  challengeId: string,
  weekId: string
): Promise<{ resolved: number; voided: number }> {
  let resolved = 0;
  let voided = 0;

  // Get all unfinished side challenges for this week
  const challenges = await prisma.sideChallenge.findMany({
    where: {
      challengeId,
      weekId,
      status: {
        in: ["PROPOSED", "ACCEPTED", "PENDING_REVIEW"],
      },
    },
    include: {
      submissions: true,
    },
  });

  for (const challenge of challenges) {
    try {
      if (challenge.status === "PENDING_REVIEW" && challenge.submissions.length === 2) {
        // Auto-resolve challenges with both submissions
        const creatorSubmission = challenge.submissions.find(
          (s) => s.userId === challenge.createdByUserId
        );
        const opponentSubmission = challenge.submissions.find(
          (s) => s.userId === challenge.opponentUserId
        );

        if (creatorSubmission && opponentSubmission) {
          const result = calculateWinner(
            challenge.metricType,
            challenge.targetValue ? Number(challenge.targetValue) : null,
            Number(creatorSubmission.valueNumber),
            Number(opponentSubmission.valueNumber),
            challenge.createdByUserId,
            challenge.opponentUserId
          );

          await prisma.$transaction(async (tx) => {
            await tx.sideChallenge.update({
              where: { id: challenge.id },
              data: {
                status: "RESOLVED",
                winnerUserId: result.winnerUserId,
                resolvedAt: new Date(),
                resolutionNote: `Auto-resolved on week lock: ${result.reason}`,
              },
            });

            await resolveSideChallengeTokens(
              tx,
              challengeId,
              weekId,
              challenge.id,
              result.winnerUserId,
              challenge.createdByUserId,
              challenge.opponentUserId,
              challenge.stakeTokens
            );
          });

          resolved++;
        }
      } else {
        // Void incomplete challenges
        const wasAccepted = challenge.status === "ACCEPTED" || challenge.status === "PENDING_REVIEW";

        await prisma.$transaction(async (tx) => {
          await tx.sideChallenge.update({
            where: { id: challenge.id },
            data: {
              status: "VOID",
              resolutionNote: "Voided due to week lock with incomplete submissions",
            },
          });

          await voidSideChallengeTokens(
            tx,
            challengeId,
            weekId,
            challenge.id,
            challenge.createdByUserId,
            challenge.opponentUserId,
            challenge.stakeTokens,
            wasAccepted
          );
        });

        voided++;
      }
    } catch (error) {
      console.error(`Failed to cleanup side challenge ${challenge.id}:`, error);
    }
  }

  return { resolved, voided };
}

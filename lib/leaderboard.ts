import { prisma } from "@/lib/prisma";

export interface ParticipantScore {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
  tied?: boolean;
}

export interface WeeklyWinner {
  userId: string;
  displayName: string;
  points: number;
  prizeAmount: number;
}

export interface PayoutSummary {
  totalPot: number;
  weeklyPayoutTotal: number;
  grandPrize: number;
  weeklyPrize: number;
  participantCount: number;
}

/**
 * Calculate weekly leaderboard for a specific week
 */
export async function getWeeklyLeaderboard(
  challengeId: string,
  weekId: string
): Promise<ParticipantScore[]> {
  const completions = await prisma.completion.findMany({
    where: {
      challengeId,
      weekId,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      taskTemplate: {
        select: {
          points: true,
        },
      },
    },
  });

  // Calculate points per user
  const userPoints = new Map<string, { displayName: string; points: number }>();

  completions.forEach((completion: { userId: string; user: { displayName: string }; taskTemplate: { points: number } }) => {
    const current = userPoints.get(completion.userId) || {
      displayName: completion.user.displayName,
      points: 0,
    };
    userPoints.set(completion.userId, {
      displayName: current.displayName,
      points: current.points + completion.taskTemplate.points,
    });
  });

  // Include all participants (even with 0 points)
  const participants = await prisma.participant.findMany({
    where: { challengeId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  participants.forEach((participant: { userId: string; user: { displayName: string } }) => {
    if (!userPoints.has(participant.userId)) {
      userPoints.set(participant.userId, {
        displayName: participant.user.displayName,
        points: 0,
      });
    }
  });

  // Sort by points descending
  const sortedUsers = Array.from(userPoints.entries())
    .map(([userId, data]: [string, { displayName: string; points: number }]) => ({
      userId,
      displayName: data.displayName,
      points: data.points,
    }))
    .sort((a, b) => b.points - a.points);

  // Assign ranks with tie handling
  const leaderboard: ParticipantScore[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedUsers.length; i++) {
    const user = sortedUsers[i];
    const tied =
      (i > 0 && user.points === sortedUsers[i - 1].points) ||
      (i < sortedUsers.length - 1 && user.points === sortedUsers[i + 1].points);

    leaderboard.push({
      userId: user.userId,
      displayName: user.displayName,
      points: user.points,
      rank: currentRank,
      tied,
    });

    // Update rank for next iteration
    if (i < sortedUsers.length - 1 && user.points !== sortedUsers[i + 1].points) {
      currentRank = i + 2;
    }
  }

  return leaderboard;
}

/**
 * Calculate overall leaderboard across all locked weeks
 */
export async function getOverallLeaderboard(
  challengeId: string
): Promise<ParticipantScore[]> {
  const weeks = await prisma.week.findMany({
    where: {
      challengeId,
      status: "LOCKED",
    },
    select: { id: true },
  });

  const completions = await prisma.completion.findMany({
    where: {
      challengeId,
      weekId: {
        in: weeks.map((w: { id: string }) => w.id),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      taskTemplate: {
        select: {
          points: true,
        },
      },
    },
  });

  // Calculate total points per user
  const userPoints = new Map<string, { displayName: string; points: number }>();

  completions.forEach((completion: { userId: string; user: { displayName: string }; taskTemplate: { points: number } }) => {
    const current = userPoints.get(completion.userId) || {
      displayName: completion.user.displayName,
      points: 0,
    };
    userPoints.set(completion.userId, {
      displayName: current.displayName,
      points: current.points + completion.taskTemplate.points,
    });
  });

  // Include all participants
  const participants = await prisma.participant.findMany({
    where: { challengeId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  participants.forEach((participant: { userId: string; user: { displayName: string } }) => {
    if (!userPoints.has(participant.userId)) {
      userPoints.set(participant.userId, {
        displayName: participant.user.displayName,
        points: 0,
      });
    }
  });

  // Sort and rank
  const sortedUsers = Array.from(userPoints.entries())
    .map(([userId, data]: [string, { displayName: string; points: number }]) => ({
      userId,
      displayName: data.displayName,
      points: data.points,
    }))
    .sort((a, b) => b.points - a.points);

  const leaderboard: ParticipantScore[] = [];
  let currentRank = 1;

  for (let i = 0; i < sortedUsers.length; i++) {
    const user = sortedUsers[i];
    const tied =
      (i > 0 && user.points === sortedUsers[i - 1].points) ||
      (i < sortedUsers.length - 1 && user.points === sortedUsers[i + 1].points);

    leaderboard.push({
      userId: user.userId,
      displayName: user.displayName,
      points: user.points,
      rank: currentRank,
      tied,
    });

    if (i < sortedUsers.length - 1 && user.points !== sortedUsers[i + 1].points) {
      currentRank = i + 2;
    }
  }

  return leaderboard;
}

/**
 * Get weekly winners for a locked week
 */
export async function getWeeklyWinners(
  challengeId: string,
  weekId: string,
  weeklyPrizeAmount: number
): Promise<WeeklyWinner[]> {
  const leaderboard = await getWeeklyLeaderboard(challengeId, weekId);

  if (leaderboard.length === 0) return [];

  const topScore = leaderboard[0].points;
  const winners = leaderboard.filter((p: ParticipantScore) => p.points === topScore);

  const prizePerWinner = weeklyPrizeAmount / winners.length;

  return winners.map((w: ParticipantScore) => ({
    userId: w.userId,
    displayName: w.displayName,
    points: w.points,
    prizeAmount: prizePerWinner,
  }));
}

/**
 * Calculate payout summary
 */
export async function getPayoutSummary(
  challengeId: string
): Promise<PayoutSummary> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!challenge) {
    throw new Error("Challenge not found");
  }

  const buyIn = Number(challenge.buyInAmount);
  const weeklyPrize = Number(challenge.weeklyPrizeAmount);
  const participantCount = challenge._count.participants;

  const totalPot = buyIn * participantCount;
  const weeklyPayoutTotal = weeklyPrize * challenge.numberOfWeeks;
  const grandPrize = challenge.grandPrizeAmount
    ? Number(challenge.grandPrizeAmount)
    : totalPot - weeklyPayoutTotal;

  return {
    totalPot,
    weeklyPayoutTotal,
    grandPrize,
    weeklyPrize,
    participantCount,
  };
}

/**
 * Get overall winners (grand prize)
 */
export async function getOverallWinners(
  challengeId: string,
  grandPrizeAmount: number
): Promise<WeeklyWinner[]> {
  const leaderboard = await getOverallLeaderboard(challengeId);

  if (leaderboard.length === 0) return [];

  const topScore = leaderboard[0].points;
  const winners = leaderboard.filter((p: ParticipantScore) => p.points === topScore);

  const prizePerWinner = grandPrizeAmount / winners.length;

  return winners.map((w: ParticipantScore) => ({
    userId: w.userId,
    displayName: w.displayName,
    points: w.points,
    prizeAmount: prizePerWinner,
  }));
}

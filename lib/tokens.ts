import { prisma } from "./prisma";

/**
 * Token utility functions for PhiFit token system
 * Handles token balance calculation, ledger retrieval, and perfect week detection
 */

export interface TokenBalance {
  userId: string;
  balance: number;
}

export interface TokenLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  createdAt: Date;
  weekIndex?: number;
  relatedEntityId?: string | null;
}

export interface PerfectWeekResult {
  userId: string;
  completedTaskCount: number;
}

/**
 * Get token balance for a specific user in a challenge
 */
export async function getTokenBalance(
  challengeId: string,
  userId: string
): Promise<number> {
  const result = await prisma.tokenLedger.aggregate({
    where: {
      challengeId,
      userId,
    },
    _sum: {
      delta: true,
    },
  });

  return result._sum.delta ?? 0;
}

/**
 * Get token balances for all participants in a challenge
 */
export async function getTokenBalances(
  challengeId: string
): Promise<Map<string, number>> {
  const grouped = await prisma.tokenLedger.groupBy({
    by: ["userId"],
    where: { challengeId },
    _sum: { delta: true },
  });

  const balanceMap = new Map<string, number>();
  grouped.forEach((entry) => {
    balanceMap.set(entry.userId, entry._sum.delta ?? 0);
  });

  // Also include participants with 0 tokens
  const allParticipants = await prisma.participant.findMany({
    where: { challengeId },
    select: { userId: true },
  });

  allParticipants.forEach((p) => {
    if (!balanceMap.has(p.userId)) {
      balanceMap.set(p.userId, 0);
    }
  });

  return balanceMap;
}

/**
 * Get token transaction ledger for a user in a challenge
 */
export async function getTokenLedger(
  challengeId: string,
  userId: string
): Promise<TokenLedgerEntry[]> {
  const entries = await prisma.tokenLedger.findMany({
    where: {
      challengeId,
      userId,
    },
    include: {
      week: {
        select: {
          weekIndex: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    delta: entry.delta,
    reason: entry.reason,
    createdAt: entry.createdAt,
    weekIndex: entry.week?.weekIndex,
    relatedEntityId: entry.relatedEntityId,
  }));
}

/**
 * Detect which participants achieved a perfect week (completed all tasks)
 * Returns list of userIds who completed all active tasks
 */
export async function detectPerfectWeeks(
  challengeId: string,
  weekId: string
): Promise<string[]> {
  // Get count of active tasks
  const activeTasks = await prisma.taskTemplate.findMany({
    where: { challengeId, active: true },
    select: { id: true },
  });

  const activeTaskCount = activeTasks.length;

  // If no tasks, no perfect weeks
  if (activeTaskCount === 0) {
    return [];
  }

  // Get all participants
  const participants = await prisma.participant.findMany({
    where: { challengeId },
    select: { userId: true },
  });

  // Get completions for this week
  const completions = await prisma.completion.findMany({
    where: { weekId },
    select: { userId: true, taskTemplateId: true },
  });

  // Build map of completions by user
  const completionsByUser = new Map<string, Set<string>>();
  completions.forEach((c) => {
    if (!completionsByUser.has(c.userId)) {
      completionsByUser.set(c.userId, new Set());
    }
    completionsByUser.get(c.userId)!.add(c.taskTemplateId);
  });

  // Find users who completed all tasks
  const perfectWeekUserIds: string[] = [];
  for (const participant of participants) {
    const userCompletions = completionsByUser.get(participant.userId);
    if (userCompletions && userCompletions.size === activeTaskCount) {
      perfectWeekUserIds.push(participant.userId);
    }
  }

  return perfectWeekUserIds;
}

/**
 * Award tokens to participants who achieved perfect weeks
 * Creates TokenLedger entries for each participant
 */
export async function awardPerfectWeekTokens(
  challengeId: string,
  weekId: string,
  userIds: string[]
): Promise<number> {
  if (userIds.length === 0) {
    return 0;
  }

  await prisma.tokenLedger.createMany({
    data: userIds.map((userId) => ({
      challengeId,
      userId,
      weekId,
      delta: 1,
      reason: "PERFECT_WEEK_EARNED",
    })),
  });

  return userIds.length;
}

/**
 * Get top token holders for a challenge (for leaderboard)
 */
export async function getTopTokenHolders(
  challengeId: string,
  limit: number = 10
): Promise<Array<{ userId: string; displayName: string; balance: number; rank: number }>> {
  const balances = await getTokenBalances(challengeId);

  // Get user info for all participants with balances
  const userIds = Array.from(balances.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true },
  });

  // Create leaderboard entries
  const leaderboard = users.map((user) => ({
    userId: user.id,
    displayName: user.displayName,
    balance: balances.get(user.id) ?? 0,
    rank: 0, // Will be assigned below
  }));

  // Sort by balance descending
  leaderboard.sort((a, b) => b.balance - a.balance);

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].balance < leaderboard[i - 1].balance) {
      currentRank = i + 1;
    }
    leaderboard[i].rank = currentRank;
  }

  return leaderboard.slice(0, limit);
}

/**
 * Check if a user has already been awarded a token for a specific week
 * Prevents duplicate awards if lock endpoint is called multiple times
 */
export async function hasReceivedPerfectWeekToken(
  challengeId: string,
  weekId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.tokenLedger.findFirst({
    where: {
      challengeId,
      weekId,
      userId,
      reason: "PERFECT_WEEK_EARNED",
    },
  });

  return existing !== null;
}

/**
 * Award perfect week tokens with duplicate prevention
 * Only awards tokens to users who haven't already received them for this week
 */
export async function awardPerfectWeekTokensSafe(
  challengeId: string,
  weekId: string
): Promise<{ awarded: number; alreadyAwarded: number }> {
  // Detect perfect weeks
  const perfectWeekUserIds = await detectPerfectWeeks(challengeId, weekId);

  if (perfectWeekUserIds.length === 0) {
    return { awarded: 0, alreadyAwarded: 0 };
  }

  // Filter out users who already received tokens
  const usersToAward: string[] = [];
  let alreadyAwarded = 0;

  for (const userId of perfectWeekUserIds) {
    const hasToken = await hasReceivedPerfectWeekToken(challengeId, weekId, userId);
    if (hasToken) {
      alreadyAwarded++;
    } else {
      usersToAward.push(userId);
    }
  }

  // Award tokens to remaining users
  const awarded = await awardPerfectWeekTokens(challengeId, weekId, usersToAward);

  return { awarded, alreadyAwarded };
}

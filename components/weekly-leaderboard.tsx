import { getWeeklyLeaderboard, getWeeklyWinners } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

interface WeeklyLeaderboardProps {
  challengeId: string;
  weekId: string;
  currentUserId: string;
  isLocked: boolean;
}

export default async function WeeklyLeaderboard({
  challengeId,
  weekId,
  currentUserId,
  isLocked,
}: WeeklyLeaderboardProps) {
  const leaderboard = await getWeeklyLeaderboard(challengeId, weekId);

  // Calculate weekly prize amount from percentages
  let weeklyPrizeAmount = 0;
  if (isLocked) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (challenge) {
      const totalPool = Number(challenge.buyInAmount) * challenge._count.participants;
      weeklyPrizeAmount = totalPool * (Number(challenge.weeklyPrizePercent) / 100);
    }
  }

  const winners =
    isLocked && weeklyPrizeAmount > 0
      ? await getWeeklyWinners(challengeId, weekId, weeklyPrizeAmount)
      : [];

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Weekly Leaderboard
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {isLocked ? "Final standings" : "Current standings"}
        </p>
      </div>

      {winners.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-300 px-4 sm:px-6 py-3 sm:py-4">
          <p className="text-xs sm:text-sm font-medium text-green-900 mb-2 sm:mb-3">
            🎉 Weekly {winners.length > 1 ? "Winners" : "Winner"}
          </p>
          <div className="space-y-2">
            {winners.map((winner: { userId: string; displayName: string; prizeAmount: number }) => (
              <div
                key={winner.userId}
                className="flex items-center justify-between"
              >
                <span className="font-semibold text-green-900 text-sm sm:text-base truncate mr-2">
                  {winner.displayName}
                </span>
                <span className="text-base sm:text-lg font-bold text-green-600 flex-shrink-0">
                  ${winner.prizeAmount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="p-4 sm:p-6 text-center text-gray-600 text-sm">
          No completions yet
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {leaderboard.map((entry: { userId: string; displayName: string; points: number; rank: number; tied?: boolean }, index: number) => {
            const isCurrentUser = entry.userId === currentUserId;
            const isWinner = winners.some((w: { userId: string }) => w.userId === entry.userId);

            return (
              <div
                key={entry.userId}
                className={`px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between ${
                  isCurrentUser ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div
                    className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                      index === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : index === 1
                        ? "bg-gray-300 text-gray-700"
                        : index === 2
                        ? "bg-amber-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium truncate ${
                        isCurrentUser ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                      {isWinner && <span className="ml-2">🏆</span>}
                    </p>
                    {entry.tied && (
                      <p className="text-xs text-gray-500">Tied</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{entry.points}</p>
                  <p className="text-xs text-gray-600">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

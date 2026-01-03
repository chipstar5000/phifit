import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  getOverallLeaderboard,
  getPayoutSummary,
  getOverallWinners,
} from "@/lib/leaderboard";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      participants: {
        where: { userId: session.userId },
      },
    },
  });

  if (!challenge || challenge.participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [leaderboard, payoutSummary] = await Promise.all([
    getOverallLeaderboard(challengeId),
    getPayoutSummary(challengeId),
  ]);

  const winners =
    payoutSummary.grandPrize > 0
      ? await getOverallWinners(challengeId, payoutSummary.grandPrize)
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900">PhiFit</h1>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/challenges/${challengeId}`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Challenge
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {challenge.name}
          </h1>
          <p className="text-gray-600">Overall Leaderboard</p>
        </div>

        {/* Payout Summary */}
        {payoutSummary.totalPot > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Prize Pool Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Pot</p>
                <p className="text-xl font-bold text-gray-900">
                  ${payoutSummary.totalPot.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Weekly Payouts</p>
                <p className="text-xl font-bold text-gray-900">
                  ${payoutSummary.weeklyPayoutTotal.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Grand Prize</p>
                <p className="text-xl font-bold text-green-600">
                  ${payoutSummary.grandPrize.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Participants</p>
                <p className="text-xl font-bold text-gray-900">
                  {payoutSummary.participantCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Winners */}
        {winners.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-yellow-900 mb-4">
              🏆 Grand Prize {winners.length > 1 ? "Winners" : "Winner"}
            </h2>
            <div className="space-y-2">
              {winners.map((winner) => (
                <div
                  key={winner.userId}
                  className="flex items-center justify-between bg-white rounded-lg p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {winner.displayName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {winner.points} points
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${winner.prizeAmount.toFixed(2)}
                    </p>
                    {winners.length > 1 && (
                      <p className="text-xs text-gray-600">Split prize</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Overall Standings
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Based on all locked weeks
            </p>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No completions yet. Start completing tasks to see the leaderboard!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.userId === session.userId;
                const isWinner = winners.some((w) => w.userId === entry.userId);

                return (
                  <div
                    key={entry.userId}
                    className={`px-6 py-4 flex items-center justify-between ${
                      isCurrentUser ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
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
                      <div>
                        <p
                          className={`font-semibold ${
                            isCurrentUser ? "text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {entry.displayName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                          {isWinner && (
                            <span className="ml-2 text-xs">🏆</span>
                          )}
                        </p>
                        {entry.tied && (
                          <p className="text-xs text-gray-500">Tied</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {entry.points}
                      </p>
                      <p className="text-xs text-gray-600">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Note: Prize amounts are for display only and are not handled by PhiFit
        </div>
      </main>
    </div>
  );
}

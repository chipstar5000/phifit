"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  balance: number;
  rank: number;
}

interface TokenLeaderboardProps {
  challengeId: string;
  currentUserId: string;
  tokenChampPrizeAmount?: number;
}

export default function TokenLeaderboard({
  challengeId,
  currentUserId,
  tokenChampPrizeAmount,
}: TokenLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(
          `/api/challenges/${challengeId}/tokens/leaderboard`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch token leaderboard");
        }
        const data = await response.json();
        setLeaderboard(data.leaderboard);
      } catch (err) {
        console.error("Error fetching token leaderboard:", err);
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [challengeId]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Token Leaderboard
        </h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Token Leaderboard
        </h2>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Find ties for current rank
  const getTiedCount = (rank: number): number => {
    return leaderboard.filter((entry) => entry.rank === rank).length;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Token Leaderboard</h2>
        {tokenChampPrizeAmount && tokenChampPrizeAmount > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-600">Token Champion Prize</p>
            <p className="text-lg font-bold text-yellow-600">
              ${Number(tokenChampPrizeAmount).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          No tokens earned yet. Complete a perfect week to earn your first token!
        </p>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.userId === currentUserId;
            const tiedCount = getTiedCount(entry.rank);
            const isTied = tiedCount > 1;

            // Rank badge styling
            let rankBadge = null;
            if (entry.rank === 1 && !isTied) {
              rankBadge = (
                <span className="text-2xl">🥇</span>
              );
            } else if (entry.rank === 2 && !isTied) {
              rankBadge = (
                <span className="text-2xl">🥈</span>
              );
            } else if (entry.rank === 3 && !isTied) {
              rankBadge = (
                <span className="text-2xl">🥉</span>
              );
            } else {
              rankBadge = (
                <span className="text-gray-600 font-semibold">
                  #{entry.rank}
                </span>
              );
            }

            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  isCurrentUser
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {rankBadge}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isCurrentUser ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    {isTied && (
                      <p className="text-xs text-gray-500">
                        Tied with {tiedCount - 1} other
                        {tiedCount - 1 === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>

                  {/* Token Count */}
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 text-yellow-900 rounded-full">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" fill="#FCD34D" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span className="font-semibold">{entry.balance}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>
          Tokens are earned by completing all tasks in a week. The participant with
          the most tokens at the end wins the Token Champion prize.
        </p>
      </div>
    </div>
  );
}

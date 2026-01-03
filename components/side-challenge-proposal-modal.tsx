"use client";

import { useState, useEffect } from "react";

interface Participant {
  userId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface SideChallengeProposalModalProps {
  challengeId: string;
  weekId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SideChallengeProposalModal({
  challengeId,
  weekId,
  onClose,
  onSuccess,
}: SideChallengeProposalModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [opponentUserId, setOpponentUserId] = useState("");
  const [title, setTitle] = useState("");
  const [rules, setRules] = useState("");
  const [metricType, setMetricType] = useState("HIGHER_WINS");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [stakeTokens, setStakeTokens] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [participantsRes, balanceRes] = await Promise.all([
          fetch(`/api/challenges/${challengeId}/participants`),
          fetch(`/api/challenges/${challengeId}/tokens/balance`),
        ]);

        if (participantsRes.ok) {
          const data = await participantsRes.json();
          setParticipants(data.participants || []);
        }

        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setTokenBalance(data.balance);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load participants");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [challengeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!opponentUserId) {
      setError("Please select an opponent");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!rules.trim()) {
      setError("Please enter rules");
      return;
    }
    if (!unit.trim()) {
      setError("Please enter a unit");
      return;
    }
    if (!stakeTokens || parseInt(stakeTokens) <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }
    if (parseInt(stakeTokens) > tokenBalance) {
      setError(`Insufficient tokens. You have ${tokenBalance} available.`);
      return;
    }
    if (metricType === "TARGET_THRESHOLD" && (!targetValue || parseFloat(targetValue) < 0)) {
      setError("Please enter a valid target value");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opponentUserId,
            title: title.trim(),
            rules: rules.trim(),
            metricType,
            unit: unit.trim(),
            targetValue: metricType === "TARGET_THRESHOLD" ? parseFloat(targetValue) : null,
            stakeTokens: parseInt(stakeTokens),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create challenge");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create challenge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Create Side Challenge</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : (
            <>
              {/* Your Token Balance */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Your Available Tokens</p>
                <p className="text-2xl font-bold text-blue-600">{tokenBalance}</p>
              </div>

              {/* Opponent */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opponent *
                </label>
                <select
                  value={opponentUserId}
                  onChange={(e) => setOpponentUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select opponent...</option>
                  {participants.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.displayName} ({p.user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Most Steps This Week"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Rules */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rules *
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Describe the challenge rules..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Metric Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric Type *
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="HIGHER_WINS"
                      checked={metricType === "HIGHER_WINS"}
                      onChange={(e) => setMetricType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Higher Wins</p>
                      <p className="text-sm text-gray-600">
                        Highest value wins (e.g., most steps, most calories)
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="LOWER_WINS"
                      checked={metricType === "LOWER_WINS"}
                      onChange={(e) => setMetricType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Lower Wins</p>
                      <p className="text-sm text-gray-600">
                        Lowest value wins (e.g., fastest time, lowest weight)
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="TARGET_THRESHOLD"
                      checked={metricType === "TARGET_THRESHOLD"}
                      onChange={(e) => setMetricType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Target Threshold</p>
                      <p className="text-sm text-gray-600">
                        Closest to target value wins
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Unit and Target Value */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g., steps, miles, minutes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                {metricType === "TARGET_THRESHOLD" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="Target number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Stake Tokens */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stake Tokens *
                </label>
                <input
                  type="number"
                  min="1"
                  max={tokenBalance}
                  value={stakeTokens}
                  onChange={(e) => setStakeTokens(e.target.value)}
                  placeholder="Number of tokens to wager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Winner takes all ({stakeTokens ? parseInt(stakeTokens) * 2 : 0} tokens total)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Challenge"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

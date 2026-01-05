"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = params.challengeId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [buyInAmount, setBuyInAmount] = useState("");
  const [weeklyPrizePercent, setWeeklyPrizePercent] = useState("");
  const [grandPrizePercent, setGrandPrizePercent] = useState("");
  const [tokenChampPrizePercent, setTokenChampPrizePercent] = useState("");
  const [estimatedParticipants, setEstimatedParticipants] = useState("10");
  const [numberOfWeeks, setNumberOfWeeks] = useState(0);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const response = await fetch(`/api/challenges/${challengeId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch challenge");
        }
        const data = await response.json();
        const challenge = data.challenge;

        setName(challenge.name);
        setDescription(challenge.description || "");
        setStartDate(new Date(challenge.startDate).toISOString().split("T")[0]);
        setBuyInAmount(challenge.buyInAmount.toString());
        setWeeklyPrizePercent(challenge.weeklyPrizePercent.toString());
        setGrandPrizePercent(challenge.grandPrizePercent.toString());
        setTokenChampPrizePercent(challenge.tokenChampPrizePercent.toString());
        setNumberOfWeeks(challenge.numberOfWeeks);
        setEstimatedParticipants(challenge.participants?.length?.toString() || "10");
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load challenge");
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [challengeId]);

  // Calculate total pool and prize amounts for preview
  const totalPool = (parseFloat(buyInAmount) || 0) * (parseInt(estimatedParticipants) || 0);
  const weeklyPrize = totalPool * ((parseFloat(weeklyPrizePercent) || 0) / 100);
  const grandPrize = totalPool * ((parseFloat(grandPrizePercent) || 0) / 100);
  const tokenChampPrize = totalPool * ((parseFloat(tokenChampPrizePercent) || 0) / 100);
  const totalPercentAllocated =
    (parseFloat(weeklyPrizePercent) || 0) * numberOfWeeks +
    (parseFloat(grandPrizePercent) || 0) +
    (parseFloat(tokenChampPrizePercent) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate percentages don't exceed 100%
    if (totalPercentAllocated > 100) {
      setError(
        `Total prize allocation (${totalPercentAllocated.toFixed(1)}%) exceeds 100%. Please adjust the percentages.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate,
          buyInAmount: buyInAmount ? parseFloat(buyInAmount) : 0,
          weeklyPrizePercent: weeklyPrizePercent ? parseFloat(weeklyPrizePercent) : 0,
          grandPrizePercent: grandPrizePercent ? parseFloat(grandPrizePercent) : 0,
          tokenChampPrizePercent: tokenChampPrizePercent
            ? parseFloat(tokenChampPrizePercent)
            : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update challenge");
        return;
      }

      // Success - redirect back to challenge page
      router.push(`/challenges/${challengeId}`);
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/challenges/${challengeId}`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Challenge
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Edit Challenge
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Challenge Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Summer Fitness Challenge"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of your challenge..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Date *
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="numberOfWeeks"
                  className="block text-sm font-medium text-gray-700"
                >
                  Number of Weeks
                </label>
                <input
                  id="numberOfWeeks"
                  type="number"
                  value={numberOfWeeks}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Cannot be changed after creation
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prize Structure
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the buy-in amount and prize percentages. Actual prize amounts
                will be calculated based on total participants.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="buyInAmount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Buy-in Amount ($)
                  </label>
                  <input
                    id="buyInAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyInAmount}
                    onChange={(e) => setBuyInAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="estimatedParticipants"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Current Participants (for preview)
                  </label>
                  <input
                    id="estimatedParticipants"
                    type="number"
                    min="1"
                    value={estimatedParticipants}
                    onChange={(e) => setEstimatedParticipants(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used to preview prize amounts below
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="weeklyPrizePercent"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Weekly Prize (% per week)
                  </label>
                  <input
                    id="weeklyPrizePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={weeklyPrizePercent}
                    onChange={(e) => setWeeklyPrizePercent(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Percentage of total pool awarded each week
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="grandPrizePercent"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Grand Prize (%)
                  </label>
                  <input
                    id="grandPrizePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={grandPrizePercent}
                    onChange={(e) => setGrandPrizePercent(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Percentage of total pool for overall winner
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tokenChampPrizePercent"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Token Champion Prize (%)
                  </label>
                  <input
                    id="tokenChampPrizePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tokenChampPrizePercent}
                    onChange={(e) => setTokenChampPrizePercent(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Percentage of total pool for token leader
                  </p>
                </div>
              </div>

              {buyInAmount &&
                estimatedParticipants &&
                (parseFloat(weeklyPrizePercent) > 0 ||
                  parseFloat(grandPrizePercent) > 0 ||
                  parseFloat(tokenChampPrizePercent) > 0) && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      Prize Pool Preview (with {estimatedParticipants} participants)
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>
                        Total Pool:{" "}
                        <span className="font-semibold">${totalPool.toFixed(2)}</span>
                      </p>
                      {parseFloat(weeklyPrizePercent) > 0 && (
                        <p>
                          Weekly Prize:{" "}
                          <span className="font-semibold">
                            ${weeklyPrize.toFixed(2)}
                          </span>{" "}
                          per week ({weeklyPrizePercent}%)
                        </p>
                      )}
                      {parseFloat(grandPrizePercent) > 0 && (
                        <p>
                          Grand Prize:{" "}
                          <span className="font-semibold">
                            ${grandPrize.toFixed(2)}
                          </span>{" "}
                          ({grandPrizePercent}%)
                        </p>
                      )}
                      {parseFloat(tokenChampPrizePercent) > 0 && (
                        <p>
                          Token Champion:{" "}
                          <span className="font-semibold">
                            ${tokenChampPrize.toFixed(2)}
                          </span>{" "}
                          ({tokenChampPrizePercent}%)
                        </p>
                      )}
                      <p className="pt-2 border-t border-blue-300">
                        Total Allocated:{" "}
                        <span
                          className={`font-semibold ${
                            totalPercentAllocated > 100
                              ? "text-red-600"
                              : "text-blue-900"
                          }`}
                        >
                          {totalPercentAllocated.toFixed(1)}%
                        </span>
                        {totalPercentAllocated > 100 && (
                          <span className="text-red-600"> (exceeds 100%!)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <Link
                href={`/challenges/${challengeId}`}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewChallengePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [numberOfWeeks, setNumberOfWeeks] = useState("4");
  const [buyInAmount, setBuyInAmount] = useState("");
  const [weeklyPrizeAmount, setWeeklyPrizeAmount] = useState("");
  const [grandPrizeAmount, setGrandPrizeAmount] = useState("");
  const [tokenChampPrizeAmount, setTokenChampPrizeAmount] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate,
          numberOfWeeks: parseInt(numberOfWeeks),
          buyInAmount: buyInAmount ? parseFloat(buyInAmount) : 0,
          weeklyPrizeAmount: weeklyPrizeAmount
            ? parseFloat(weeklyPrizeAmount)
            : 0,
          grandPrizeAmount: grandPrizeAmount
            ? parseFloat(grandPrizeAmount)
            : null,
          tokenChampPrizeAmount: tokenChampPrizeAmount
            ? parseFloat(tokenChampPrizeAmount)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create challenge");
        return;
      }

      // Redirect to challenge page
      router.push(`/challenges/${data.challenge.id}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate default start date (next Monday)
  const getNextMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split("T")[0];
  };

  if (!startDate) {
    setStartDate(getNextMonday());
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
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Challenge
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
                  Number of Weeks *
                </label>
                <input
                  id="numberOfWeeks"
                  type="number"
                  required
                  min="1"
                  max="52"
                  value={numberOfWeeks}
                  onChange={(e) => setNumberOfWeeks(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payouts (Display Only)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                These amounts are for tracking only. PhiFit does not handle real
                money transactions.
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
                    htmlFor="weeklyPrizeAmount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Weekly Prize ($)
                  </label>
                  <input
                    id="weeklyPrizeAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={weeklyPrizeAmount}
                    onChange={(e) => setWeeklyPrizeAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="grandPrizeAmount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Grand Prize ($)
                  </label>
                  <input
                    id="grandPrizeAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={grandPrizeAmount}
                    onChange={(e) => setGrandPrizeAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tokenChampPrizeAmount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Token Champion Prize ($)
                  </label>
                  <input
                    id="tokenChampPrizeAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tokenChampPrizeAmount}
                    onChange={(e) => setTokenChampPrizeAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Challenge"}
              </button>
              <Link
                href="/dashboard"
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

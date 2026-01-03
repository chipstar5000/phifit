"use client";

import { useState } from "react";
import { useToast } from "./toast-provider";

interface SideChallengeSubmissionModalProps {
  challengeId: string;
  weekId: string;
  sideChallengeId: string;
  metricType: string;
  unit: string;
  targetValue: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SideChallengeSubmissionModal({
  challengeId,
  weekId,
  sideChallengeId,
  metricType,
  unit,
  targetValue,
  onClose,
  onSuccess,
}: SideChallengeSubmissionModalProps) {
  const toast = useToast();
  const [valueNumber, setValueNumber] = useState("");
  const [valueDisplay, setValueDisplay] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate display value
  const handleValueChange = (value: string) => {
    setValueNumber(value);
    if (value) {
      setValueDisplay(`${value} ${unit}`);
    } else {
      setValueDisplay("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!valueNumber || parseFloat(valueNumber) < 0) {
      setError("Please enter a valid value");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges/${sideChallengeId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valueNumber: parseFloat(valueNumber),
            valueDisplay: valueDisplay.trim() || `${valueNumber} ${unit}`,
            note: note.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit result");
      }

      const data = await response.json();

      // Check if challenge was auto-resolved
      if (data.resolved) {
        const message = data.resolution.winnerUserId
          ? `Challenge resolved! ${
              data.resolution.winnerId === "creator" ? "Creator" : "Opponent"
            } wins!`
          : "Challenge resolved! It's a tie - stakes refunded.";
        toast.success(message, 6000);
      } else {
        toast.info("Result submitted! Waiting for opponent to submit.", 5000);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Submit Result</h2>
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

          {/* Challenge Info */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Metric Type</p>
                <p className="font-semibold text-gray-900">
                  {metricType.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Unit</p>
                <p className="font-semibold text-gray-900">{unit}</p>
              </div>
              {targetValue !== null && (
                <div className="col-span-2">
                  <p className="text-gray-600">Target Value</p>
                  <p className="font-semibold text-gray-900">{targetValue} {unit}</p>
                </div>
              )}
            </div>
          </div>

          {/* Value Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Value *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valueNumber}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder={`Enter your ${unit}`}
              className="w-full px-4 py-3 text-2xl border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {metricType === "HIGHER_WINS" && "Higher value wins"}
              {metricType === "LOWER_WINS" && "Lower value wins"}
              {metricType === "TARGET_THRESHOLD" && "Closest to target wins"}
            </p>
          </div>

          {/* Display Value */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Value (Optional)
            </label>
            <input
              type="text"
              value={valueDisplay}
              onChange={(e) => setValueDisplay(e.target.value)}
              placeholder={valueNumber ? `${valueNumber} ${unit}` : "Auto-generated"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How this value will be displayed (e.g., "10,000 steps")
            </p>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any context or proof..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
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
              {submitting ? "Submitting..." : "Submit Result"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

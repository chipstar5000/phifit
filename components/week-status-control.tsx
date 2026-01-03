"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WeekStatusControlProps {
  challengeId: string;
  weekId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export default function WeekStatusControl({
  challengeId,
  weekId,
  currentStatus,
  onStatusChange,
}: WeekStatusControlProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"lock" | "unlock" | null>(
    null
  );
  const [error, setError] = useState("");

  const handleAction = async (action: "lock" | "unlock") => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/admin/lock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update week status");
      }

      const data = await response.json();

      if (onStatusChange) {
        onStatusChange(data.week.status);
      }

      router.refresh();
      setShowConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = currentStatus === "LOCKED";
  const isOpen = currentStatus === "OPEN";

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Week Status:</span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            isLocked
              ? "bg-red-100 text-red-800"
              : isOpen
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {isLocked && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          )}
          {isOpen && (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
          )}
          {currentStatus}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isOpen && (
          <button
            onClick={() => setShowConfirm("lock")}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Lock Week Early
          </button>
        )}

        {isLocked && (
          <button
            onClick={() => setShowConfirm("unlock")}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Unlock Week
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm{" "}
              {showConfirm === "lock" ? "Lock Week" : "Unlock Week"}
            </h3>
            <p className="text-gray-600 mb-4">
              {showConfirm === "lock"
                ? "Locking this week will prevent participants from editing their completions. You can still edit as an organizer."
                : "Unlocking this week will allow participants to edit their completions again. Use this to fix mistakes."}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to continue?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(showConfirm)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  showConfirm === "lock"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Processing..." : `Yes, ${showConfirm} week`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

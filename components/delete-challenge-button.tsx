"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteChallengeButtonProps {
  challengeId: string;
  challengeName: string;
}

export default function DeleteChallengeButton({
  challengeId,
  challengeName,
}: DeleteChallengeButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== challengeName) {
      setError("Challenge name does not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/challenges/${challengeId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete challenge");
        return;
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        Delete Challenge
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete Challenge
            </h2>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="text-sm text-red-700">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                <li>The challenge and all its settings</li>
                <li>All weeks and their data</li>
                <li>All task completions</li>
                <li>All side challenges</li>
                <li>All token transactions</li>
              </ul>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              To confirm deletion, please type the challenge name:{" "}
              <span className="font-semibold text-gray-900">{challengeName}</span>
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError("");
              }}
              placeholder="Type challenge name"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 mb-4"
            />

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmText("");
                  setError("");
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== challengeName}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Deleting..." : "Delete Challenge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

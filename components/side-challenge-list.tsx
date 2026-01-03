"use client";

import { useState, useEffect } from "react";
import SideChallengeCard from "./side-challenge-card";
import SideChallengeProposalModal from "./side-challenge-proposal-modal";
import SideChallengeSubmissionModal from "./side-challenge-submission-modal";
import { useToast } from "./toast-provider";

interface SideChallenge {
  id: string;
  title: string;
  rules: string;
  status: string;
  stakeTokens: number;
  metricType: string;
  unit: string;
  targetValue: number | null;
  createdByUserId: string;
  opponentUserId: string;
  winnerUserId: string | null;
  expiresAt: Date;
  createdBy: { id: string; displayName: string; email: string };
  opponent: { id: string; displayName: string; email: string };
  submissions: Array<{
    id: string;
    userId: string;
    valueNumber: number;
    valueDisplay: string;
    note: string | null;
    user: { displayName: string };
  }>;
}

interface SideChallengeListProps {
  challengeId: string;
  weekId: string;
  currentUserId: string;
  isOrganizer: boolean;
}

export default function SideChallengeList({
  challengeId,
  weekId,
  currentUserId,
  isOrganizer,
}: SideChallengeListProps) {
  const toast = useToast();
  const [sideChallenges, setSideChallenges] = useState<SideChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<SideChallenge | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSideChallenges = async () => {
    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch side challenges");
      }
      const data = await response.json();
      setSideChallenges(data.sideChallenges);
    } catch (err) {
      console.error("Error fetching side challenges:", err);
      setError("Failed to load side challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSideChallenges();
  }, [challengeId, weekId]);

  const handleCardClick = (challenge: SideChallenge) => {
    setSelectedChallenge(challenge);
  };

  const handleCloseDetail = () => {
    setSelectedChallenge(null);
  };

  const handleAccept = async (challengeId: string) => {
    if (!selectedChallenge) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges/${selectedChallenge.id}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept challenge");
      }

      await fetchSideChallenges();
      setSelectedChallenge(null);
      toast.success("Challenge accepted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept challenge");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (challengeId: string) => {
    if (!selectedChallenge) return;

    // Use browser confirm for now - could be improved with a custom modal
    if (!confirm("Are you sure you want to decline this challenge?")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges/${selectedChallenge.id}/decline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to decline challenge");
      }

      await fetchSideChallenges();
      setSelectedChallenge(null);
      toast.success("Challenge declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline challenge");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async (reason: string) => {
    if (!selectedChallenge) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/side-challenges/${selectedChallenge.id}/void`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to void challenge");
      }

      await fetchSideChallenges();
      setSelectedChallenge(null);
      toast.success("Challenge voided");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void challenge");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Side Challenges</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Side Challenges</h2>
          <button
            onClick={() => setShowProposalModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + New Challenge
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {sideChallenges.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-2">No side challenges yet</p>
            <p className="text-sm text-gray-500">
              Create a head-to-head wager with another participant
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sideChallenges.map((challenge) => (
              <SideChallengeCard
                key={challenge.id}
                sideChallenge={challenge}
                currentUserId={currentUserId}
                onClick={() => handleCardClick(challenge)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <SideChallengeProposalModal
          challengeId={challengeId}
          weekId={weekId}
          onClose={() => setShowProposalModal(false)}
          onSuccess={() => {
            setShowProposalModal(false);
            fetchSideChallenges();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedChallenge.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        selectedChallenge.status === "PROPOSED"
                          ? "bg-blue-100 text-blue-800"
                          : selectedChallenge.status === "ACCEPTED"
                          ? "bg-green-100 text-green-800"
                          : selectedChallenge.status === "RESOLVED"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedChallenge.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
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

              {/* Participants */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Creator</p>
                    <p className="font-semibold text-gray-900">
                      {selectedChallenge.createdBy.displayName}
                      {selectedChallenge.createdByUserId === currentUserId && " (You)"}
                    </p>
                  </div>
                  <span className="text-gray-400">vs</span>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Opponent</p>
                    <p className="font-semibold text-gray-900">
                      {selectedChallenge.opponent.displayName}
                      {selectedChallenge.opponentUserId === currentUserId && " (You)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Rules</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedChallenge.rules}</p>
              </div>

              {/* Metric Info */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Metric Type</p>
                    <p className="font-semibold text-gray-900">
                      {selectedChallenge.metricType.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit</p>
                    <p className="font-semibold text-gray-900">{selectedChallenge.unit}</p>
                  </div>
                  {selectedChallenge.targetValue !== null && (
                    <div>
                      <p className="text-sm text-gray-600">Target Value</p>
                      <p className="font-semibold text-gray-900">{selectedChallenge.targetValue}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Stake</p>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" fill="#FCD34D" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <p className="font-semibold text-gray-900">{selectedChallenge.stakeTokens}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions */}
              {selectedChallenge.submissions.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Submissions</h3>
                  <div className="space-y-2">
                    {selectedChallenge.submissions.map((submission) => (
                      <div key={submission.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {submission.user.displayName}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {submission.valueDisplay}
                          </span>
                        </div>
                        {submission.note && (
                          <p className="text-sm text-gray-600 mt-1">{submission.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Winner Display */}
              {selectedChallenge.status === "RESOLVED" && (
                <div
                  className={`mb-4 p-4 rounded-lg ${
                    selectedChallenge.winnerUserId
                      ? selectedChallenge.winnerUserId === currentUserId
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {selectedChallenge.winnerUserId
                      ? selectedChallenge.winnerUserId === currentUserId
                        ? "🏆 You Won!"
                        : `Winner: ${
                            selectedChallenge.winnerUserId === selectedChallenge.createdByUserId
                              ? selectedChallenge.createdBy.displayName
                              : selectedChallenge.opponent.displayName
                          }`
                      : "Tie - Stakes Refunded"}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedChallenge.status === "PROPOSED" &&
                  selectedChallenge.opponentUserId === currentUserId && (
                    <>
                      <button
                        onClick={() => handleAccept(challengeId)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Accept Challenge
                      </button>
                      <button
                        onClick={() => handleDecline(challengeId)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}

                {selectedChallenge.status === "ACCEPTED" &&
                  (selectedChallenge.createdByUserId === currentUserId ||
                    selectedChallenge.opponentUserId === currentUserId) &&
                  !selectedChallenge.submissions.some((s) => s.userId === currentUserId) && (
                    <button
                      onClick={() => setShowSubmissionModal(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Submit Result
                    </button>
                  )}

                {isOrganizer &&
                  selectedChallenge.status !== "RESOLVED" &&
                  selectedChallenge.status !== "VOID" &&
                  selectedChallenge.status !== "DECLINED" && (
                    <button
                      onClick={() => {
                        const reason = prompt("Enter reason for voiding this challenge:");
                        if (reason) {
                          handleVoid(reason);
                        }
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Void Challenge
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmissionModal && selectedChallenge && (
        <SideChallengeSubmissionModal
          challengeId={challengeId}
          weekId={weekId}
          sideChallengeId={selectedChallenge.id}
          metricType={selectedChallenge.metricType}
          unit={selectedChallenge.unit}
          targetValue={selectedChallenge.targetValue}
          onClose={() => setShowSubmissionModal(false)}
          onSuccess={() => {
            setShowSubmissionModal(false);
            fetchSideChallenges();
            setSelectedChallenge(null);
          }}
        />
      )}
    </>
  );
}

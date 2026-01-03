"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Participant {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface ParticipantManagerProps {
  challengeId: string;
  initialParticipants: Participant[];
  organizerUserId: string;
  currentUserId: string;
}

export default function ParticipantManager({
  challengeId,
  initialParticipants,
  organizerUserId,
  currentUserId,
}: ParticipantManagerProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOrganizer = currentUserId === organizerUserId;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to invite participant");
        return;
      }

      setParticipants([...participants, data.participant]);
      setEmail("");
      setShowInviteForm(false);
      router.refresh();
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (
      !confirm("Are you sure you want to remove this participant from the challenge?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/participants?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setParticipants(participants.filter((p) => p.userId !== userId));
        router.refresh();
      }
    } catch (err) {
      console.error("Remove participant error:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Participants ({participants.length})
        </h3>
        {isOrganizer && !showInviteForm && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Invite
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showInviteForm && (
        <form onSubmit={handleInvite} className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite by Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              User must have a PhiFit account
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Inviting..." : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                setError("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {participants.map((participant) => {
          const isCurrentUser = participant.userId === currentUserId;
          const isOrganizerUser = participant.userId === organizerUserId;
          const canRemove =
            isOrganizer && !isOrganizerUser && participant.userId !== currentUserId;

          return (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {participant.user.displayName}
                  </span>
                  {isOrganizerUser && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      Organizer
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{participant.user.email}</p>
              </div>
              {canRemove && (
                <button
                  onClick={() => handleRemove(participant.userId)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

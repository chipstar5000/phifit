"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CompletionAuditInfo from "./completion-audit-info";

interface Participant {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface Task {
  id: string;
  name: string;
  points: number;
}

interface Completion {
  id: string;
  userId: string;
  taskTemplateId: string;
  source: string;
  completedAt: Date | string;
  editedAt?: Date | string | null;
  editedBy?: { displayName: string } | null;
  user: { displayName: string };
  taskTemplate: { id: string; name: string; points: number };
  note?: string | null;
}

interface WeekAdminGridProps {
  challengeId: string;
  weekId: string;
  participants: Participant[];
  tasks: Task[];
  completions: Completion[];
}

export default function WeekAdminGrid({
  challengeId,
  weekId,
  participants,
  tasks,
  completions: initialCompletions,
}: WeekAdminGridProps) {
  const router = useRouter();
  const [completions, setCompletions] = useState(initialCompletions);
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Create a map for quick lookup
  const completionMap = new Map<string, Completion>();
  completions.forEach((c) => {
    const key = `${c.userId}-${c.taskTemplateId}`;
    completionMap.set(key, c);
  });

  // Calculate points per participant
  const pointsByUser = new Map<string, number>();
  completions.forEach((c) => {
    const current = pointsByUser.get(c.userId) || 0;
    pointsByUser.set(c.userId, current + c.taskTemplate.points);
  });

  const handleToggle = async (userId: string, taskId: string) => {
    const cellKey = `${userId}-${taskId}`;
    const existingCompletion = completionMap.get(cellKey);
    const newCompletedState = !existingCompletion;

    setLoadingCell(cellKey);
    setError("");

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/admin/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            taskTemplateId: taskId,
            completed: newCompletedState,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to toggle completion");
      }

      const data = await response.json();

      // Update local state optimistically
      if (newCompletedState && data.completion) {
        setCompletions((prev) => [
          ...prev.filter((c) => !(c.userId === userId && c.taskTemplateId === taskId)),
          data.completion,
        ]);
      } else {
        setCompletions((prev) =>
          prev.filter((c) => !(c.userId === userId && c.taskTemplateId === taskId))
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingCell(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border-b-2 border-gray-300 p-3 text-left text-sm font-semibold text-gray-900">
                Participant
              </th>
              {tasks.map((task) => (
                <th
                  key={task.id}
                  className="border-b-2 border-gray-300 p-3 text-center text-sm font-semibold text-gray-900 min-w-[120px]"
                >
                  <div>{task.name}</div>
                  <div className="text-xs text-gray-500 font-normal mt-1">
                    {task.points} pts
                  </div>
                </th>
              ))}
              <th className="border-b-2 border-gray-300 p-3 text-center text-sm font-semibold text-gray-900">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => {
              const userPoints = pointsByUser.get(participant.userId) || 0;

              return (
                <tr key={participant.userId} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white border-b border-gray-200 p-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {participant.user.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {participant.user.email}
                      </div>
                    </div>
                  </td>
                  {tasks.map((task) => {
                    const cellKey = `${participant.userId}-${task.id}`;
                    const completion = completionMap.get(cellKey);
                    const isCompleted = !!completion;
                    const isLoading = loadingCell === cellKey;
                    const isHovered = hoveredCell === cellKey;
                    const isOrganizerEdit =
                      completion?.source === "ORGANIZER_EDIT";

                    return (
                      <td
                        key={task.id}
                        className="border-b border-gray-200 p-1 text-center"
                      >
                        <div className="relative">
                          <button
                            onClick={() =>
                              handleToggle(participant.userId, task.id)
                            }
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            disabled={isLoading}
                            className={`w-full h-12 rounded-lg transition-colors ${
                              isCompleted
                                ? isOrganizerEdit
                                  ? "bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300"
                                  : "bg-green-100 hover:bg-green-200 border-2 border-green-300"
                                : "bg-gray-50 hover:bg-gray-100 border-2 border-gray-200"
                            } ${
                              isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"
                            }`}
                          >
                            {isLoading ? (
                              <svg
                                className="animate-spin h-5 w-5 mx-auto text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : isCompleted ? (
                              <svg
                                className={`w-6 h-6 mx-auto ${
                                  isOrganizerEdit
                                    ? "text-yellow-700"
                                    : "text-green-700"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : null}
                          </button>

                          {/* Tooltip on hover */}
                          {isHovered && completion && (
                            <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <CompletionAuditInfo
                                completion={completion}
                                variant="inline"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-gray-200 p-3 text-center">
                    <div className="font-bold text-gray-900">{userPoints}</div>
                    <div className="text-xs text-gray-500">points</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300" />
          <span>Participant completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300" />
          <span>Organizer edited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-50 border-2 border-gray-200" />
          <span>Not completed</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 italic">
        Click any cell to toggle completion. Hover over completed cells to see audit info.
      </p>
    </div>
  );
}

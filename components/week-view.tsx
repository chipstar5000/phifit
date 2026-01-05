"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CompletionAuditInfo from "./completion-audit-info";

interface Task {
  id: string;
  name: string;
  description: string;
  points: number;
}

interface Completion {
  id: string;
  userId: string;
  taskTemplateId: string;
  completedAt: string | Date;
  source?: string;
  editedAt?: string | Date | null;
  editedBy?: { displayName: string } | null;
  user?: { displayName: string };
  note?: string | null;
}

interface WeekViewProps {
  challengeId: string;
  weekId: string;
  weekIndex: number;
  weekStatus: "UPCOMING" | "OPEN" | "LOCKED";
  startDate: Date;
  endDate: Date;
  tasks: Task[];
  userCompletions: Completion[];
  currentUserId: string;
  isOrganizer: boolean;
}

export default function WeekView({
  challengeId,
  weekId,
  weekIndex,
  weekStatus,
  startDate,
  endDate,
  tasks,
  userCompletions,
  currentUserId,
  isOrganizer,
}: WeekViewProps) {
  const router = useRouter();
  const [completions, setCompletions] = useState<Set<string>>(
    new Set(userCompletions.map((c) => c.taskTemplateId))
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Create completion map for audit info lookup
  const completionMap = new Map<string, Completion>();
  userCompletions.forEach((c) => {
    completionMap.set(c.taskTemplateId, c);
  });

  const canEdit = weekStatus === "OPEN";

  const handleToggle = async (taskId: string) => {
    if (!canEdit) return;

    setError("");
    setLoading(taskId);

    const isCompleted = completions.has(taskId);

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/weeks/${weekId}/completions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskTemplateId: taskId,
            completed: !isCompleted,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update completion");
        return;
      }

      // Update local state
      const newCompletions = new Set(completions);
      if (isCompleted) {
        newCompletions.delete(taskId);
      } else {
        newCompletions.add(taskId);
      }
      setCompletions(newCompletions);
      router.refresh();
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
  const earnedPoints = tasks
    .filter((task) => completions.has(task.id))
    .reduce((sum, task) => sum + task.points, 0);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Week {weekIndex + 1}
            </h2>
            <p className="text-sm text-gray-600">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {earnedPoints}
              <span className="text-lg text-gray-500">/{totalPoints}</span>
            </div>
            <p className="text-sm text-gray-600">points</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {weekStatus === "OPEN" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
              Open for completions
            </span>
          )}
          {weekStatus === "LOCKED" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Locked
            </span>
          )}
          {weekStatus === "UPCOMING" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Upcoming
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!canEdit && weekStatus !== "UPCOMING" && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            Week is locked. {isOrganizer && "As organizer, you can still edit completions in the admin view."}
          </div>
        )}

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No tasks for this week. {isOrganizer && "Add tasks to get started."}
            </p>
          ) : (
            tasks.map((task: { id: string; name: string; description?: string; points: number }) => {
              const isCompleted = completions.has(task.id);
              const isLoading = loading === task.id;
              const completionData = completionMap.get(task.id);

              return (
                <button
                  key={task.id}
                  onClick={() => handleToggle(task.id)}
                  disabled={!canEdit || isLoading}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  } ${
                    !canEdit ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${isLoading ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded border-2 flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isCompleted && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isCompleted
                              ? "text-green-900"
                              : "text-gray-900"
                          }`}
                        >
                          {task.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({task.points} {task.points === 1 ? "pt" : "pts"})
                        </span>
                        {isCompleted && completionData?.source === "ORGANIZER_EDIT" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            Edited by organizer
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p
                          className={`text-sm mt-1 ${
                            isCompleted ? "text-green-700" : "text-gray-600"
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                      {isCompleted && completionData && completionData.user && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <CompletionAuditInfo
                            completion={{
                              ...completionData,
                              source: completionData.source || "PARTICIPANT",
                              user: completionData.user,
                            }}
                            variant="inline"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {completions.size === tasks.length && tasks.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-medium">
              Perfect week! All tasks completed! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

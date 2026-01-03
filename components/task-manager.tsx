"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  name: string;
  description: string;
  points: number;
  active: boolean;
  order: number;
}

interface TaskManagerProps {
  challengeId: string;
  initialTasks: Task[];
  isOrganizer: boolean;
}

export default function TaskManager({
  challengeId,
  initialTasks,
  isOrganizer,
}: TaskManagerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", description: "", points: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/challenges/${challengeId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create task");
        return;
      }

      setTasks([...tasks, data.task]);
      setNewTask({ name: "", description: "", points: 1 });
      setShowAddForm(false);
      router.refresh();
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (taskId: string, currentActive: boolean) => {
    try {
      const response = await fetch(
        `/api/challenges/${challengeId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !currentActive }),
        }
      );

      if (response.ok) {
        setTasks(
          tasks.map((t) =>
            t.id === taskId ? { ...t, active: !currentActive } : t
          )
        );
        router.refresh();
      }
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
        {isOrganizer && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Task
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div>
            <input
              type="text"
              required
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              placeholder="Task name (e.g., Run 3 miles)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <textarea
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              min="1"
              value={newTask.points}
              onChange={(e) =>
                setNewTask({ ...newTask, points: parseInt(e.target.value) })
              }
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setError("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-gray-600 text-sm">
          No tasks yet. {isOrganizer && "Add tasks to get started."}
        </p>
      ) : (
        <div className="space-y-2">
          {tasks
            .filter((t) => t.active)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{task.name}</span>
                    <span className="text-sm text-gray-500">
                      ({task.points} {task.points === 1 ? "point" : "points"})
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => handleToggleActive(task.id, task.active)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

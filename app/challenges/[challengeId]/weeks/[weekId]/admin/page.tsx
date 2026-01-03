import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import WeekAdminGrid from "@/components/week-admin-grid";
import WeekStatusControl from "@/components/week-status-control";
import { detectPerfectWeeks } from "@/lib/tokens";

export default async function WeekAdminPage({
  params,
}: {
  params: Promise<{ challengeId: string; weekId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { challengeId, weekId } = await params;

  // Verify user is organizer
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      name: true,
      organizerUserId: true,
    },
  });

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Challenge Not Found
          </h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Only organizers can access admin page
  if (challenge.organizerUserId !== session.userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            Only organizers can access the admin interface.
          </p>
          <Link
            href={`/challenges/${challengeId}/weeks/${weekId}`}
            className="text-blue-600 hover:text-blue-700"
          >
            Go to Week View
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all admin data
  const [participants, tasks, completions, week] = await Promise.all([
    prisma.participant.findMany({
      where: { challengeId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          displayName: "asc",
        },
      },
    }),
    prisma.taskTemplate.findMany({
      where: { challengeId, active: true },
      orderBy: { order: "asc" },
    }),
    prisma.completion.findMany({
      where: { weekId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        taskTemplate: {
          select: {
            id: true,
            name: true,
            points: true,
          },
        },
        editedBy: {
          select: {
            displayName: true,
          },
        },
      },
    }),
    prisma.week.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        weekIndex: true,
        startDate: true,
        endDate: true,
        status: true,
        lockedAt: true,
      },
    }),
  ]);

  if (!week) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Week Not Found
          </h1>
          <Link
            href={`/challenges/${challengeId}`}
            className="text-blue-600 hover:text-blue-700"
          >
            Go to Challenge
          </Link>
        </div>
      </div>
    );
  }

  // Calculate stats
  const pointsByUser = new Map<string, number>();
  completions.forEach((c: { userId: string; taskTemplate: { points: number } }) => {
    const current = pointsByUser.get(c.userId) || 0;
    pointsByUser.set(c.userId, current + c.taskTemplate.points);
  });

  const completionsByUser = new Map<string, Set<string>>();
  completions.forEach((c: { userId: string; taskTemplateId: string }) => {
    if (!completionsByUser.has(c.userId)) {
      completionsByUser.set(c.userId, new Set());
    }
    completionsByUser.get(c.userId)!.add(c.taskTemplateId);
  });

  const perfectWeekCount = Array.from(completionsByUser.values()).filter(
    (taskSet) => taskSet.size === tasks.length
  ).length;

  const averagePoints =
    participants.length > 0
      ? Array.from(pointsByUser.values()).reduce((a, b) => a + b, 0) /
        participants.length
      : 0;

  // Detect perfect weeks
  const perfectWeekUserIds = await detectPerfectWeeks(challengeId, weekId);
  const perfectWeekParticipants = participants.filter((p: { userId: string }) =>
    perfectWeekUserIds.includes(p.userId)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900">PhiFit</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={`/challenges/${challengeId}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Challenge Details
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/challenges/${challengeId}/weeks/${weekId}`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Participant View
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {challenge.name}
              </h1>
              <p className="text-lg text-gray-600">
                Week {week.weekIndex + 1} Admin Panel
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(week.startDate).toLocaleDateString()} -{" "}
                {new Date(week.endDate).toLocaleDateString()}
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded">
              Organizer
            </span>
          </div>

          {/* Week Status Control */}
          <div className="pt-4 border-t border-gray-200">
            <WeekStatusControl
              challengeId={challengeId}
              weekId={weekId}
              currentStatus={week.status}
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Week Statistics
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Completions</p>
              <p className="text-3xl font-bold text-gray-900">
                {completions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Perfect Weeks</p>
              <p className="text-3xl font-bold text-green-600">
                {perfectWeekCount}
              </p>
              <p className="text-xs text-gray-500">
                {participants.length > 0
                  ? `${Math.round(
                      (perfectWeekCount / participants.length) * 100
                    )}% of participants`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Points</p>
              <p className="text-3xl font-bold text-blue-600">
                {averagePoints.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Perfect Week Token Awards */}
          {perfectWeekParticipants.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="#FCD34D" stroke="currentColor" strokeWidth="1" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">
                  Token Awards ({perfectWeekParticipants.length} {perfectWeekParticipants.length === 1 ? "participant" : "participants"})
                </h3>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {week.status === "LOCKED"
                  ? "Tokens awarded to participants who completed all tasks:"
                  : "These participants will earn tokens when the week is locked:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {perfectWeekParticipants.map((participant: { userId: string; user: { displayName: string; email: string } }) => (
                  <div
                    key={participant.userId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg text-sm"
                  >
                    <span className="font-medium">{participant.user.displayName}</span>
                    <span className="text-yellow-700">+1</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Grid */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Completion Grid
          </h2>
          <WeekAdminGrid
            challengeId={challengeId}
            weekId={weekId}
            participants={participants}
            tasks={tasks}
            completions={completions}
          />
        </div>

        {/* Info Banner */}
        {week.status === "LOCKED" && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  This week is locked for participants
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  As an organizer, you can still edit completions to fix
                  mistakes or add missing data. All edits will be tracked in the
                  audit trail.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

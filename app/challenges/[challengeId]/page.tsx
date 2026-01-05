import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentWeekIndex, calculateEndDate } from "@/lib/weeks";
import TaskManager from "@/components/task-manager";
import ParticipantManager from "@/components/participant-manager";
import TokenBalance from "@/components/token-balance";
import DeleteChallengeButton from "@/components/delete-challenge-button";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      organizer: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      participants: {
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
          joinedAt: "asc",
        },
      },
      taskTemplates: {
        orderBy: { order: "asc" },
      },
      weeks: {
        orderBy: { weekIndex: "asc" },
      },
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

  // Check access
  const hasAccess =
    challenge.organizerUserId === session.userId ||
    challenge.participants.some((p: { userId: string }) => p.userId === session.userId);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have access to this challenge.
          </p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizer = challenge.organizerUserId === session.userId;
  const currentWeek = getCurrentWeekIndex(
    challenge.startDate,
    challenge.numberOfWeeks
  );
  const endDate = calculateEndDate(challenge.startDate, challenge.numberOfWeeks);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {challenge.name}
              </h1>
              {challenge.description && (
                <p className="text-gray-600">{challenge.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOrganizer && (
                <>
                  <Link
                    href={`/challenges/${challenge.id}/edit`}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded">
                    Organizer
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(challenge.startDate).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-semibold text-gray-900">
                {endDate.toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold text-gray-900">
                {challenge.numberOfWeeks} weeks
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">
                {currentWeek !== null ? (
                  <span className="text-green-600">
                    Week {currentWeek + 1} / {challenge.numberOfWeeks}
                  </span>
                ) : new Date() < challenge.startDate ? (
                  <span className="text-blue-600">Upcoming</span>
                ) : (
                  <span className="text-gray-600">Completed</span>
                )}
              </p>
            </div>
          </div>

          {/* Token Balance - Always Show */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Your Tokens</p>
              <TokenBalance challengeId={challenge.id} size="md" showLabel={true} />
            </div>
            <p className="text-xs text-gray-500">
              Earn 1 token for each perfect week (completing all tasks)
            </p>
          </div>

          {Number(challenge.buyInAmount) > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Prize Pool (Display Only)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Buy-in</p>
                  <p className="font-semibold text-gray-900">
                    ${Number(challenge.buyInAmount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Pool</p>
                  <p className="font-semibold text-gray-900">
                    ${(Number(challenge.buyInAmount) * challenge.participants.length).toFixed(2)}
                  </p>
                </div>
                {Number(challenge.weeklyPrizePercent) > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Weekly Prize</p>
                    <p className="font-semibold text-gray-900">
                      ${((Number(challenge.buyInAmount) * challenge.participants.length) * (Number(challenge.weeklyPrizePercent) / 100)).toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">
                        ({Number(challenge.weeklyPrizePercent)}%)
                      </span>
                    </p>
                  </div>
                )}
                {Number(challenge.grandPrizePercent) > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Grand Prize</p>
                    <p className="font-semibold text-gray-900">
                      ${((Number(challenge.buyInAmount) * challenge.participants.length) * (Number(challenge.grandPrizePercent) / 100)).toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">
                        ({Number(challenge.grandPrizePercent)}%)
                      </span>
                    </p>
                  </div>
                )}
                {Number(challenge.tokenChampPrizePercent) > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Token Champion</p>
                    <p className="font-semibold text-gray-900">
                      ${((Number(challenge.buyInAmount) * challenge.participants.length) * (Number(challenge.tokenChampPrizePercent) / 100)).toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">
                        ({Number(challenge.tokenChampPrizePercent)}%)
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <TaskManager
              challengeId={challenge.id}
              initialTasks={challenge.taskTemplates}
              isOrganizer={isOrganizer}
            />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <ParticipantManager
              challengeId={challenge.id}
              initialParticipants={challenge.participants}
              organizerUserId={challenge.organizerUserId}
              currentUserId={session.userId}
            />
          </div>
        </div>

        {/* Admin Tools Section for Organizers */}
        {isOrganizer && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Organizer Admin Tools
            </h2>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Manage completions, lock/unlock weeks, and view detailed participant data
              </p>
              <div className="space-y-2">
                {challenge.weeks.map((week: { id: string; weekIndex: number; status: string }, index: number) => {
                  const isCurrent = index === currentWeek;
                  const isLocked = week.status === "LOCKED";

                  return (
                    <Link
                      key={week.id}
                      href={`/challenges/${challenge.id}/weeks/${week.id}/admin`}
                      className={`block p-3 rounded-lg border-2 hover:shadow-md transition-all ${
                        isCurrent
                          ? "border-blue-300 bg-blue-50 hover:border-blue-400"
                          : isLocked
                          ? "border-red-200 bg-red-50 hover:border-red-300"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${
                            isCurrent ? "text-blue-900" : isLocked ? "text-red-900" : "text-gray-900"
                          }`}>
                            Week {week.weekIndex + 1}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isLocked
                              ? "bg-red-100 text-red-700"
                              : week.status === "OPEN"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {week.status}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {currentWeek !== null && (
            <Link
              href={`/challenges/${challenge.id}/week`}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900 font-semibold text-lg">
                    Week {currentWeek + 1} Active
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    Complete your tasks
                  </p>
                </div>
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          )}

          <Link
            href={`/challenges/${challenge.id}/leaderboard`}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-900 font-semibold text-lg">
                  Leaderboard
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  See overall standings
                </p>
              </div>
              <span className="text-2xl">🏆</span>
            </div>
          </Link>
        </div>

        {/* Delete Challenge - Organizer Only */}
        {isOrganizer && (
          <div className="mt-8 border-t border-gray-300 pt-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2">
                Danger Zone
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Permanently delete this challenge and all associated data. This action cannot be undone.
              </p>
              <DeleteChallengeButton
                challengeId={challenge.id}
                challengeName={challenge.name}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

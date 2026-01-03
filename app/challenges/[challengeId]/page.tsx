import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentWeekIndex, calculateEndDate } from "@/lib/weeks";
import TaskManager from "@/components/task-manager";
import ParticipantManager from "@/components/participant-manager";

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
    challenge.participants.some((p) => p.userId === session.userId);

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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {challenge.name}
              </h1>
              {challenge.description && (
                <p className="text-gray-600">{challenge.description}</p>
              )}
            </div>
            {isOrganizer && (
              <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded">
                Organizer
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(challenge.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-semibold text-gray-900">
                {endDate.toLocaleDateString()}
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

          {(Number(challenge.buyInAmount) > 0 || Number(challenge.weeklyPrizeAmount) > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Prize Pool (Display Only)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Number(challenge.buyInAmount) > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Buy-in</p>
                    <p className="font-semibold text-gray-900">
                      ${Number(challenge.buyInAmount).toFixed(2)}
                    </p>
                  </div>
                )}
                {Number(challenge.weeklyPrizeAmount) > 0 && (
                  <div>
                    <p className="text-xs text-gray-600">Weekly Prize</p>
                    <p className="font-semibold text-gray-900">
                      ${Number(challenge.weeklyPrizeAmount).toFixed(2)}
                    </p>
                  </div>
                )}
                {challenge.grandPrizeAmount && (
                  <div>
                    <p className="text-xs text-gray-600">Grand Prize</p>
                    <p className="font-semibold text-gray-900">
                      ${Number(challenge.grandPrizeAmount).toFixed(2)}
                    </p>
                  </div>
                )}
                {challenge.tokenChampPrizeAmount && (
                  <div>
                    <p className="text-xs text-gray-600">Token Champion</p>
                    <p className="font-semibold text-gray-900">
                      ${Number(challenge.tokenChampPrizeAmount).toFixed(2)}
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

        {currentWeek !== null && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <span className="font-semibold">Challenge is active!</span> Weekly
              task completion features coming soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

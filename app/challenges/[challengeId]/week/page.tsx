import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentWeekIndex } from "@/lib/weeks";
import WeekView from "@/components/week-view";

export default async function CurrentWeekPage({
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
      participants: {
        where: { userId: session.userId },
      },
      taskTemplates: {
        where: { active: true },
        orderBy: { order: "asc" },
      },
      weeks: {
        orderBy: { weekIndex: "asc" },
      },
    },
  });

  if (!challenge || challenge.participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizer = challenge.organizerUserId === session.userId;
  const currentWeekIndex = getCurrentWeekIndex(
    challenge.startDate,
    challenge.numberOfWeeks
  );

  if (currentWeekIndex === null) {
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

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              href={`/challenges/${challengeId}`}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Challenge
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {challenge.name}
            </h2>
            {new Date() < challenge.startDate ? (
              <div>
                <p className="text-gray-600 mb-4">
                  This challenge hasn't started yet.
                </p>
                <p className="text-sm text-gray-500">
                  Starts on {new Date(challenge.startDate).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  This challenge has ended.
                </p>
                <p className="text-sm text-gray-500">Check the leaderboards!</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const currentWeek = challenge.weeks[currentWeekIndex];

  if (!currentWeek) {
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
            Back to Challenge
          </Link>
        </div>
      </div>
    );
  }

  // Get user's completions for this week
  const completions = await prisma.completion.findMany({
    where: {
      weekId: currentWeek.id,
      userId: session.userId,
    },
  });

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/challenges/${challengeId}`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Challenge
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {challenge.name}
          </h1>
          <p className="text-gray-600">This Week's Tasks</p>
        </div>

        <WeekView
          challengeId={challenge.id}
          weekId={currentWeek.id}
          weekIndex={currentWeek.weekIndex}
          weekStatus={currentWeek.status}
          startDate={currentWeek.startDate}
          endDate={currentWeek.endDate}
          tasks={challenge.taskTemplates}
          userCompletions={completions}
          currentUserId={session.userId}
          isOrganizer={isOrganizer}
        />

        {/* Week navigation */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Weeks</p>
              <div className="flex gap-2 mt-2">
                {challenge.weeks.map((week: { id: string }, index) => {
                  const isCurrent = index === currentWeekIndex;
                  const isPast = index < currentWeekIndex;

                  return (
                    <Link
                      key={week.id}
                      href={`/challenges/${challengeId}/weeks/${week.id}`}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : isPast
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

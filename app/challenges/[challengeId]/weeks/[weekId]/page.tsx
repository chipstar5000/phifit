import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import WeekView from "@/components/week-view";
import WeeklyLeaderboard from "@/components/weekly-leaderboard";
import SideChallengeList from "@/components/side-challenge-list";

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ challengeId: string; weekId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { challengeId, weekId } = await params;

  const [challenge, week] = await Promise.all([
    prisma.challenge.findUnique({
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
    }),
    prisma.week.findUnique({
      where: { id: weekId, challengeId },
    }),
  ]);

  if (!challenge || challenge.participants.length === 0 || !week) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizer = challenge.organizerUserId === session.userId;

  // Get user's completions for this week with audit info
  const completions = await prisma.completion.findMany({
    where: {
      weekId: week.id,
      userId: session.userId,
    },
    include: {
      user: {
        select: {
          displayName: true,
        },
      },
      editedBy: {
        select: {
          displayName: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900">FriendlyFit</h1>
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
            href={`/challenges/${challengeId}/week`}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Current Week
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {challenge.name}
          </h1>
          <p className="text-gray-600">Week {week.weekIndex + 1}</p>
        </div>

        <WeekView
          challengeId={challenge.id}
          weekId={week.id}
          weekIndex={week.weekIndex}
          weekStatus={week.status}
          startDate={week.startDate}
          endDate={week.endDate}
          tasks={challenge.taskTemplates}
          userCompletions={completions}
          currentUserId={session.userId}
          isOrganizer={isOrganizer}
        />

        {/* Weekly Leaderboard */}
        <div className="mt-6">
          <WeeklyLeaderboard
            challengeId={challenge.id}
            weekId={week.id}
            currentUserId={session.userId}
            isLocked={week.status === "LOCKED"}
          />
        </div>

        {/* Side Challenges */}
        <div className="mt-6">
          <SideChallengeList
            challengeId={challenge.id}
            weekId={week.id}
            currentUserId={session.userId}
            isOrganizer={isOrganizer}
          />
        </div>

        {/* Week navigation */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Weeks</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {challenge.weeks.map((w: { id: string }, index: number) => {
                  const isCurrent = w.id === weekId;

                  return (
                    <Link
                      key={w.id}
                      href={`/challenges/${challengeId}/weeks/${w.id}`}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

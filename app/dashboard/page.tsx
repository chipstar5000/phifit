import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentWeekIndex } from "@/lib/weeks";
import MobileNav from "@/components/mobile-nav";
import FloatingActionButton from "@/components/floating-action-button";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      displayName: true,
      email: true,
    },
  });

  // Get user's challenges
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { organizerUserId: session.userId },
        {
          participants: {
            some: { userId: session.userId },
          },
        },
      ],
    },
    include: {
      organizer: {
        select: { displayName: true },
      },
      _count: {
        select: { participants: true, taskTemplates: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav userName={user?.displayName} showCreateChallenge={true} />
      <FloatingActionButton
        href="/challenges/new"
        label="Create Challenge"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Challenges</h2>
          <Link
            href="/challenges/new"
            className="hidden md:inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Challenge
          </Link>
        </div>

        {challenges.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">
              You're not part of any challenges yet.
            </p>
            <Link
              href="/challenges/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Challenge
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge: { id: string; name: string; description: string; startDate: Date; numberOfWeeks: number; organizerUserId: string; _count: { participants: number } }) => {
              const isOrganizer = challenge.organizerUserId === session.userId;
              const currentWeek = getCurrentWeekIndex(
                challenge.startDate,
                challenge.numberOfWeeks
              );
              const isActive = currentWeek !== null;

              return (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.id}`}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {challenge.name}
                    </h3>
                    {isOrganizer && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Organizer
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {challenge.description || "No description"}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div>
                      <span className="font-medium">
                        {challenge._count.participants}
                      </span>{" "}
                      participants
                    </div>
                    <div>
                      <span className="font-medium">
                        {challenge.numberOfWeeks}
                      </span>{" "}
                      weeks
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {isActive ? (
                      <span className="text-sm font-medium text-green-600">
                        Active - Week {(currentWeek ?? 0) + 1}
                      </span>
                    ) : currentWeek === null &&
                      new Date() < challenge.startDate ? (
                      <span className="text-sm font-medium text-blue-600">
                        Starts{" "}
                        {new Date(challenge.startDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        Completed
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

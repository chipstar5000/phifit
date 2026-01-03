import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";

// GET /api/challenges/[challengeId]/weeks/[weekId]/admin/overview - Get full week data for admin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; weekId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, weekId } = await params;

    // Verify user is organizer
    const isOrganizer = await verifyOrganizer(challengeId, session.userId);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Only organizers can access admin overview" },
        { status: 403 }
      );
    }

    // Fetch all data needed for admin grid
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

    if (!week || participants.length === 0) {
      return NextResponse.json(
        { error: "Week or participants not found" },
        { status: 404 }
      );
    }

    // Calculate points per participant
    const pointsByUser = new Map<string, number>();
    completions.forEach((completion: { userId: string; taskTemplate: { points: number } }) => {
      const current = pointsByUser.get(completion.userId) || 0;
      pointsByUser.set(completion.userId, current + completion.taskTemplate.points);
    });

    // Calculate perfect weeks (users who completed all tasks)
    const completionsByUser = new Map<string, Set<string>>();
    completions.forEach((completion: { userId: string; taskTemplateId: string }) => {
      if (!completionsByUser.has(completion.userId)) {
        completionsByUser.set(completion.userId, new Set());
      }
      completionsByUser.get(completion.userId)!.add(completion.taskTemplateId);
    });

    const perfectWeekCount = Array.from(completionsByUser.values()).filter(
      (taskSet) => taskSet.size === tasks.length
    ).length;

    return NextResponse.json({
      week,
      participants,
      tasks,
      completions,
      stats: {
        totalCompletions: completions.length,
        perfectWeeks: perfectWeekCount,
        averagePoints:
          participants.length > 0
            ? Array.from(pointsByUser.values()).reduce((a, b) => a + b, 0) /
              participants.length
            : 0,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin overview" },
      { status: 500 }
    );
  }
}

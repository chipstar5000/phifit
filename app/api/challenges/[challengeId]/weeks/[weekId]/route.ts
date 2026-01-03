import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/challenges/[challengeId]/weeks/[weekId]
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

    // Verify access
    const participant = await prisma.participant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get week with completions
    const week = await prisma.week.findUnique({
      where: { id: weekId, challengeId },
      include: {
        completions: {
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
                description: true,
                points: true,
              },
            },
            editedBy: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    // Calculate points per user
    const userPoints = new Map<string, number>();
    week.completions.forEach((completion) => {
      const current = userPoints.get(completion.userId) || 0;
      userPoints.set(
        completion.userId,
        current + completion.taskTemplate.points
      );
    });

    return NextResponse.json({
      week,
      pointsByUser: Object.fromEntries(userPoints),
    });
  } catch (error) {
    console.error("Get week error:", error);
    return NextResponse.json(
      { error: "Failed to fetch week" },
      { status: 500 }
    );
  }
}

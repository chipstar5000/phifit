import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";

// POST /api/challenges/[challengeId]/weeks/[weekId]/admin/completions - Organizer toggle completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; weekId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, weekId } = await params;
    const body = await request.json();
    const { userId, taskTemplateId, completed, note } = body;

    if (!userId || !taskTemplateId) {
      return NextResponse.json(
        { error: "userId and taskTemplateId are required" },
        { status: 400 }
      );
    }

    // Verify user is organizer
    const isOrganizer = await verifyOrganizer(challengeId, session.userId);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Only organizers can use admin endpoints" },
        { status: 403 }
      );
    }

    // Verify week belongs to challenge
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: { challengeId: true },
    });

    if (!week || week.challengeId !== challengeId) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    // Verify target user is a participant
    const participant = await prisma.participant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "User is not a participant in this challenge" },
        { status: 404 }
      );
    }

    // Verify task exists and is active
    const task = await prisma.taskTemplate.findUnique({
      where: { id: taskTemplateId, challengeId },
      select: { active: true },
    });

    if (!task || !task.active) {
      return NextResponse.json(
        { error: "Task not found or inactive" },
        { status: 404 }
      );
    }

    if (completed) {
      // Create/update completion with organizer edit tracking
      const completion = await prisma.completion.upsert({
        where: {
          weekId_taskTemplateId_userId: {
            weekId,
            taskTemplateId,
            userId,
          },
        },
        create: {
          challengeId,
          weekId,
          taskTemplateId,
          userId,
          source: "ORGANIZER_EDIT",
          editedByUserId: session.userId,
          editedAt: new Date(),
          note: note || null,
        },
        update: {
          completedAt: new Date(),
          source: "ORGANIZER_EDIT",
          editedByUserId: session.userId,
          editedAt: new Date(),
          note: note || null,
        },
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
      });

      return NextResponse.json({ completion });
    } else {
      // Delete completion
      try {
        await prisma.completion.delete({
          where: {
            weekId_taskTemplateId_userId: {
              weekId,
              taskTemplateId,
              userId,
            },
          },
        });

        return NextResponse.json({ success: true, completed: false });
      } catch (error) {
        // If completion doesn't exist, that's fine
        return NextResponse.json({ success: true, completed: false });
      }
    }
  } catch (error) {
    console.error("Admin toggle completion error:", error);
    return NextResponse.json(
      { error: "Failed to update completion" },
      { status: 500 }
    );
  }
}

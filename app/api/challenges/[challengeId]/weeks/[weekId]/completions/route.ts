import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CompletionSource, WeekStatus } from "@prisma/client";

// GET /api/challenges/[challengeId]/weeks/[weekId]/completions
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

    // Get completions for this week
    const completions = await prisma.completion.findMany({
      where: {
        challengeId,
        weekId,
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

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("Get completions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}

// POST /api/challenges/[challengeId]/weeks/[weekId]/completions - Toggle completion
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
    const { taskTemplateId, completed } = body;

    if (!taskTemplateId) {
      return NextResponse.json(
        { error: "taskTemplateId is required" },
        { status: 400 }
      );
    }

    // Verify participant
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

    // Check week status
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: { status: true, challengeId: true },
    });

    if (!week || week.challengeId !== challengeId) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    // Participants can only edit during OPEN status
    if (week.status !== WeekStatus.OPEN) {
      return NextResponse.json(
        { error: "Week is not open for completions" },
        { status: 400 }
      );
    }

    // Check if task exists and is active
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
      // Create completion
      const completion = await prisma.completion.upsert({
        where: {
          weekId_taskTemplateId_userId: {
            weekId,
            taskTemplateId,
            userId: session.userId,
          },
        },
        create: {
          challengeId,
          weekId,
          taskTemplateId,
          userId: session.userId,
          source: CompletionSource.PARTICIPANT,
        },
        update: {
          completedAt: new Date(),
          source: CompletionSource.PARTICIPANT,
        },
        include: {
          taskTemplate: {
            select: {
              name: true,
              points: true,
            },
          },
        },
      });

      return NextResponse.json({ completion });
    } else {
      // Remove completion
      await prisma.completion.delete({
        where: {
          weekId_taskTemplateId_userId: {
            weekId,
            taskTemplateId,
            userId: session.userId,
          },
        },
      });

      return NextResponse.json({ success: true, completed: false });
    }
  } catch (error) {
    console.error("Toggle completion error:", error);
    return NextResponse.json(
      { error: "Failed to update completion" },
      { status: 500 }
    );
  }
}

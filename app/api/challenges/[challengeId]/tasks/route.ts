import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/challenges/[challengeId]/tasks - Get task templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;

    // Check access
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        organizerUserId: true,
        participants: {
          where: { userId: session.userId },
          select: { userId: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const hasAccess =
      challenge.organizerUserId === session.userId ||
      challenge.participants.length > 0;

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get tasks
    const tasks = await prisma.taskTemplate.findMany({
      where: { challengeId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/challenges/[challengeId]/tasks - Create task template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;
    const body = await request.json();
    const { name, description, points } = body;

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Task name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Check if user is organizer
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { organizerUserId: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    if (challenge.organizerUserId !== session.userId) {
      return NextResponse.json(
        { error: "Only organizer can create tasks" },
        { status: 403 }
      );
    }

    // Get current max order
    const maxOrderTask = await prisma.taskTemplate.findFirst({
      where: { challengeId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (maxOrderTask?.order ?? -1) + 1;

    // Create task
    const task = await prisma.taskTemplate.create({
      data: {
        challengeId,
        name: name.trim(),
        description: description?.trim() || "",
        points: points ? parseInt(points) : 1,
        order: nextOrder,
        active: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

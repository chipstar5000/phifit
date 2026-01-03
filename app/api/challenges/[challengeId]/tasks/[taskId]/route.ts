import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/challenges/[challengeId]/tasks/[taskId] - Update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; taskId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, taskId } = await params;
    const body = await request.json();

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
        { error: "Only organizer can update tasks" },
        { status: 403 }
      );
    }

    // Update task
    const task = await prisma.taskTemplate.update({
      where: { id: taskId, challengeId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && {
          description: body.description.trim(),
        }),
        ...(body.points !== undefined && { points: parseInt(body.points) }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.order !== undefined && { order: parseInt(body.order) }),
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/challenges/[challengeId]/tasks/[taskId] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string; taskId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId, taskId } = await params;

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
        { error: "Only organizer can delete tasks" },
        { status: 403 }
      );
    }

    // Soft delete by marking inactive (preserves historical completions)
    await prisma.taskTemplate.update({
      where: { id: taskId, challengeId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/challenges/[challengeId] - Get challenge details
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
          where: { active: true },
          orderBy: { order: "asc" },
        },
        weeks: {
          orderBy: { weekIndex: "asc" },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const hasAccess =
      challenge.organizerUserId === session.userId ||
      challenge.participants.some((p: { userId: string }) => p.userId === session.userId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error("Get challenge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}

// PATCH /api/challenges/[challengeId] - Update challenge
export async function PATCH(
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
        { error: "Only organizer can update challenge" },
        { status: 403 }
      );
    }

    // Validate startDate if provided
    let startDateObj;
    if (body.startDate) {
      startDateObj = new Date(body.startDate);
      if (isNaN(startDateObj.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date" },
          { status: 400 }
        );
      }
    }

    // Update challenge
    const updatedChallenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && {
          description: body.description.trim(),
        }),
        ...(startDateObj && { startDate: startDateObj }),
        ...(body.buyInAmount !== undefined && {
          buyInAmount: parseFloat(body.buyInAmount),
        }),
        ...(body.weeklyPrizePercent !== undefined && {
          weeklyPrizePercent: parseFloat(body.weeklyPrizePercent),
        }),
        ...(body.grandPrizePercent !== undefined && {
          grandPrizePercent: parseFloat(body.grandPrizePercent),
        }),
        ...(body.tokenChampPrizePercent !== undefined && {
          tokenChampPrizePercent: parseFloat(body.tokenChampPrizePercent),
        }),
        ...(body.status && { status: body.status }),
      },
    });

    // If startDate was changed, update all week dates
    if (startDateObj) {
      const weeks = await prisma.week.findMany({
        where: { challengeId },
        orderBy: { weekIndex: "asc" },
      });

      for (const week of weeks) {
        const weekStart = new Date(startDateObj);
        weekStart.setDate(startDateObj.getDate() + week.weekIndex * 7);
        weekStart.setHours(0, 0, 0, 0); // Start at midnight

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999); // End at 23:59:59.999

        await prisma.week.update({
          where: { id: week.id },
          data: {
            startDate: weekStart,
            endDate: weekEnd,
          },
        });
      }
    }

    return NextResponse.json({ challenge: updatedChallenge });
  } catch (error) {
    console.error("Update challenge error:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

// DELETE /api/challenges/[challengeId] - Delete challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;

    // Check if user is organizer
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        organizerUserId: true,
        name: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    if (challenge.organizerUserId !== session.userId) {
      return NextResponse.json(
        { error: "Only organizer can delete challenge" },
        { status: 403 }
      );
    }

    // Delete challenge (Prisma cascade deletes all related records)
    await prisma.challenge.delete({
      where: { id: challengeId },
    });

    return NextResponse.json({
      success: true,
      message: `Challenge "${challenge.name}" deleted successfully`
    });
  } catch (error) {
    console.error("Delete challenge error:", error);
    return NextResponse.json(
      { error: "Failed to delete challenge" },
      { status: 500 }
    );
  }
}

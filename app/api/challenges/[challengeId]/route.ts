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

    // Update challenge
    const updatedChallenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.description !== undefined && {
          description: body.description.trim(),
        }),
        ...(body.buyInAmount !== undefined && {
          buyInAmount: parseFloat(body.buyInAmount),
        }),
        ...(body.weeklyPrizeAmount !== undefined && {
          weeklyPrizeAmount: parseFloat(body.weeklyPrizeAmount),
        }),
        ...(body.grandPrizeAmount !== undefined && {
          grandPrizeAmount: body.grandPrizeAmount
            ? parseFloat(body.grandPrizeAmount)
            : null,
        }),
        ...(body.tokenChampPrizeAmount !== undefined && {
          tokenChampPrizeAmount: body.tokenChampPrizeAmount
            ? parseFloat(body.tokenChampPrizeAmount)
            : null,
        }),
        ...(body.status && { status: body.status }),
      },
    });

    return NextResponse.json({ challenge: updatedChallenge });
  } catch (error) {
    console.error("Update challenge error:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

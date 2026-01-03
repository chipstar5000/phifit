import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateWeeks } from "@/lib/weeks";
import { ChallengeStatus } from "@prisma/client";

// GET /api/challenges - List user's challenges
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [
          { organizerUserId: session.userId },
          {
            participants: {
              some: {
                userId: session.userId,
              },
            },
          },
        ],
      },
      include: {
        organizer: {
          select: {
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
        },
        _count: {
          select: {
            participants: true,
            taskTemplates: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("Get challenges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

// POST /api/challenges - Create a new challenge
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      startDate,
      numberOfWeeks,
      buyInAmount,
      weeklyPrizeAmount,
      grandPrizeAmount,
      tokenChampPrizeAmount,
    } = body;

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Challenge name must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date" },
        { status: 400 }
      );
    }

    if (!numberOfWeeks || numberOfWeeks < 1 || numberOfWeeks > 52) {
      return NextResponse.json(
        { error: "Number of weeks must be between 1 and 52" },
        { status: 400 }
      );
    }

    // Create challenge
    const challenge = await prisma.challenge.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        startDate: start,
        numberOfWeeks: parseInt(numberOfWeeks),
        buyInAmount: buyInAmount ? parseFloat(buyInAmount) : 0,
        weeklyPrizeAmount: weeklyPrizeAmount
          ? parseFloat(weeklyPrizeAmount)
          : 0,
        grandPrizeAmount: grandPrizeAmount
          ? parseFloat(grandPrizeAmount)
          : null,
        tokenChampPrizeAmount: tokenChampPrizeAmount
          ? parseFloat(tokenChampPrizeAmount)
          : null,
        organizerUserId: session.userId,
        status: ChallengeStatus.ACTIVE,
      },
    });

    // Add organizer as participant
    await prisma.participant.create({
      data: {
        challengeId: challenge.id,
        userId: session.userId,
        buyInPaid: true,
      },
    });

    // Generate weeks
    const weeksData = generateWeeks(start, parseInt(numberOfWeeks));
    await prisma.week.createMany({
      data: weeksData.map((week) => ({
        challengeId: challenge.id,
        weekIndex: week.weekIndex,
        startDate: week.startDate,
        endDate: week.endDate,
        status: week.status,
      })),
    });

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error("Create challenge error:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}

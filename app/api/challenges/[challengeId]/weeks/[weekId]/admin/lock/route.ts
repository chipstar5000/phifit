import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";

// POST /api/challenges/[challengeId]/weeks/[weekId]/admin/lock - Manual lock/unlock week
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
    const { action } = body;

    if (action !== "lock" && action !== "unlock") {
      return NextResponse.json(
        { error: 'Action must be "lock" or "unlock"' },
        { status: 400 }
      );
    }

    // Verify user is organizer
    const isOrganizer = await verifyOrganizer(challengeId, session.userId);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Only organizers can lock/unlock weeks" },
        { status: 403 }
      );
    }

    // Verify week belongs to challenge
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: { challengeId: true, status: true },
    });

    if (!week || week.challengeId !== challengeId) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    // Update week status
    const updatedWeek = await prisma.week.update({
      where: { id: weekId },
      data: {
        status: action === "lock" ? "LOCKED" : "OPEN",
        lockedAt: action === "lock" ? new Date() : null,
      },
    });

    return NextResponse.json({
      week: updatedWeek,
      message: `Week ${action === "lock" ? "locked" : "unlocked"} successfully`,
    });
  } catch (error) {
    console.error("Week lock/unlock error:", error);
    return NextResponse.json(
      { error: "Failed to update week status" },
      { status: 500 }
    );
  }
}

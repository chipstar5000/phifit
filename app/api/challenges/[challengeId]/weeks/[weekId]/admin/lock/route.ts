import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";
import { awardPerfectWeekTokensSafe } from "@/lib/tokens";
import { cleanupSideChallengesOnWeekLock } from "@/lib/side-challenges";

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

    // If locking the week, detect perfect weeks and award tokens
    let tokenAwards = null;
    let sideChallengeCleanup = null;
    if (action === "lock") {
      try {
        tokenAwards = await awardPerfectWeekTokensSafe(challengeId, weekId);
        console.log(
          `Week ${weekId} locked: ${tokenAwards.awarded} tokens awarded, ${tokenAwards.alreadyAwarded} already had tokens`
        );
      } catch (tokenError) {
        // Log error but don't fail the lock operation
        console.error("Error awarding perfect week tokens:", tokenError);
      }

      // Cleanup side challenges (resolve pending, void incomplete)
      try {
        sideChallengeCleanup = await cleanupSideChallengesOnWeekLock(
          challengeId,
          weekId
        );
        console.log(
          `Week ${weekId} side challenges cleanup: ${sideChallengeCleanup.resolved} resolved, ${sideChallengeCleanup.voided} voided`
        );
      } catch (sideChallengeError) {
        // Log error but don't fail the lock operation
        console.error("Error cleaning up side challenges:", sideChallengeError);
      }
    }

    return NextResponse.json({
      week: updatedWeek,
      message: `Week ${action === "lock" ? "locked" : "unlocked"} successfully`,
      tokenAwards: tokenAwards || undefined,
      sideChallengeCleanup: sideChallengeCleanup || undefined,
    });
  } catch (error) {
    console.error("Week lock/unlock error:", error);
    return NextResponse.json(
      { error: "Failed to update week status" },
      { status: 500 }
    );
  }
}

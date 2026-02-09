import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { verifyOrganizer } from "@/lib/authorization";
import { detectPerfectWeeks } from "@/lib/tokens";

// POST /api/challenges/[challengeId]/weeks/[weekId]/admin/recalculate-tokens
// Recalculates perfect week tokens: awards missing, revokes undeserved
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

    // Verify user is organizer
    const isOrganizer = await verifyOrganizer(challengeId, session.userId);
    if (!isOrganizer) {
      return NextResponse.json(
        { error: "Only organizers can recalculate tokens" },
        { status: 403 }
      );
    }

    // Verify week belongs to challenge and is locked
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      select: { challengeId: true, status: true },
    });

    if (!week || week.challengeId !== challengeId) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    if (week.status !== "LOCKED") {
      return NextResponse.json(
        { error: "Can only recalculate tokens for locked weeks" },
        { status: 400 }
      );
    }

    // Get current qualifying users
    const qualifyingUserIds = new Set(
      await detectPerfectWeeks(challengeId, weekId)
    );

    // Get existing PERFECT_WEEK_EARNED ledger entries for this week
    const existingEntries = await prisma.tokenLedger.findMany({
      where: {
        challengeId,
        weekId,
        reason: "PERFECT_WEEK_EARNED",
      },
      select: { id: true, userId: true },
    });

    const existingUserIds = new Set(existingEntries.map((e) => e.userId));

    // Award tokens to newly qualifying users
    const toAward = [...qualifyingUserIds].filter(
      (id) => !existingUserIds.has(id)
    );

    // Revoke tokens from users who no longer qualify
    const toRevoke = existingEntries.filter(
      (e) => !qualifyingUserIds.has(e.userId)
    );

    // Unchanged = in both sets
    const unchanged =
      existingEntries.length - toRevoke.length;

    // Perform awards
    if (toAward.length > 0) {
      await prisma.tokenLedger.createMany({
        data: toAward.map((userId) => ({
          challengeId,
          userId,
          weekId,
          delta: 1,
          reason: "PERFECT_WEEK_EARNED",
        })),
      });
    }

    // Perform revocations (delete the ledger entries)
    if (toRevoke.length > 0) {
      await prisma.tokenLedger.deleteMany({
        where: {
          id: { in: toRevoke.map((e) => e.id) },
        },
      });
    }

    console.log(
      `Recalculated tokens for week ${weekId}: awarded=${toAward.length}, revoked=${toRevoke.length}, unchanged=${unchanged}`
    );

    return NextResponse.json({
      awarded: toAward.length,
      revoked: toRevoke.length,
      unchanged,
    });
  } catch (error) {
    console.error("Recalculate tokens error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate tokens" },
      { status: 500 }
    );
  }
}

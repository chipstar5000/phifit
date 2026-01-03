import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardPerfectWeekTokensSafe } from "@/lib/tokens";
import { cleanupSideChallengesOnWeekLock } from "@/lib/side-challenges";

/**
 * Cron endpoint to auto-lock weeks that have ended
 * Should be called periodically (e.g., via Vercel Cron, GitHub Actions, or external cron)
 *
 * For security, consider adding a CRON_SECRET env var and validate it here
 */
export async function GET() {
  try {
    const now = new Date();

    // Find all OPEN weeks that have passed their end date
    const weeksToLock = await prisma.week.findMany({
      where: {
        status: "OPEN",
        endDate: {
          lt: now,
        },
      },
      include: {
        challenge: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`Found ${weeksToLock.length} weeks to lock`);

    // Lock each week
    const results = [];
    for (const week of weeksToLock) {
      try {
        await prisma.week.update({
          where: { id: week.id },
          data: {
            status: "LOCKED",
            lockedAt: now,
          },
        });

        // Award tokens for perfect weeks
        let tokenAwards = null;
        try {
          tokenAwards = await awardPerfectWeekTokensSafe(week.challengeId, week.id);
          console.log(
            `Week ${week.weekIndex} (${week.challenge.name}): ${tokenAwards.awarded} tokens awarded, ${tokenAwards.alreadyAwarded} already had tokens`
          );
        } catch (tokenError) {
          console.error(`Error awarding tokens for week ${week.id}:`, tokenError);
        }

        // Cleanup side challenges
        let sideChallengeCleanup = null;
        try {
          sideChallengeCleanup = await cleanupSideChallengesOnWeekLock(
            week.challengeId,
            week.id
          );
          console.log(
            `Week ${week.weekIndex} (${week.challenge.name}) side challenges: ${sideChallengeCleanup.resolved} resolved, ${sideChallengeCleanup.voided} voided`
          );
        } catch (sideChallengeError) {
          console.error(`Error cleaning up side challenges for week ${week.id}:`, sideChallengeError);
        }

        results.push({
          weekId: week.id,
          challengeId: week.challengeId,
          challengeName: week.challenge.name,
          weekIndex: week.weekIndex,
          status: "locked",
          tokensAwarded: tokenAwards?.awarded,
          sideChallengesResolved: sideChallengeCleanup?.resolved,
          sideChallengesVoided: sideChallengeCleanup?.voided,
        });

        console.log(
          `Locked week ${week.weekIndex} of challenge ${week.challenge.name}`
        );
      } catch (error) {
        console.error(`Failed to lock week ${week.id}:`, error);
        results.push({
          weekId: week.id,
          challengeId: week.challengeId,
          weekIndex: week.weekIndex,
          status: "error",
          error: String(error),
        });
      }
    }

    // Also update any UPCOMING weeks that have started
    const weeksToOpen = await prisma.week.findMany({
      where: {
        status: "UPCOMING",
        startDate: {
          lte: now,
        },
        endDate: {
          gte: now,
        },
      },
    });

    for (const week of weeksToOpen) {
      try {
        await prisma.week.update({
          where: { id: week.id },
          data: {
            status: "OPEN",
          },
        });

        results.push({
          weekId: week.id,
          challengeId: week.challengeId,
          weekIndex: week.weekIndex,
          status: "opened",
        });

        console.log(`Opened week ${week.weekIndex}`);
      } catch (error) {
        console.error(`Failed to open week ${week.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      lockedCount: weeksToLock.length,
      openedCount: weeksToOpen.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Lock weeks cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to lock weeks",
        details: String(error),
      },
      { status: 500 }
    );
  }
}

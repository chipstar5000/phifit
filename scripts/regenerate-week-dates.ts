/**
 * Regenerate all week dates from challenge start dates
 * Run with: npx tsx scripts/regenerate-week-dates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function regenerateWeekDates() {
  console.log("Starting week date regeneration...");

  try {
    const challenges = await prisma.challenge.findMany({
      include: {
        weeks: {
          orderBy: { weekIndex: "asc" },
        },
      },
    });

    console.log(`Found ${challenges.length} challenges`);

    for (const challenge of challenges) {
      console.log(`\nProcessing challenge: ${challenge.name}`);
      console.log(`Challenge start date: ${challenge.startDate.toISOString()}`);

      for (const week of challenge.weeks) {
        // Calculate correct week dates from challenge startDate
        const weekStart = new Date(challenge.startDate);
        weekStart.setUTCDate(weekStart.getUTCDate() + week.weekIndex * 7);
        weekStart.setUTCHours(0, 0, 0, 0); // Midnight UTC

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999); // End of day UTC

        console.log(
          `  Week ${week.weekIndex}: ${week.startDate.toISOString()} -> ${weekStart.toISOString()}`
        );

        await prisma.week.update({
          where: { id: week.id },
          data: {
            startDate: weekStart,
            endDate: weekEnd,
          },
        });
      }
    }

    console.log("\nUpdating week statuses...");
    const now = new Date();

    // Update UPCOMING weeks to OPEN if they've started
    const weeksToOpen = await prisma.week.findMany({
      where: {
        status: "UPCOMING",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    for (const week of weeksToOpen) {
      await prisma.week.update({
        where: { id: week.id },
        data: { status: "OPEN" },
      });
      console.log(`Opened week ${week.weekIndex}`);
    }

    console.log(`\nOpened ${weeksToOpen.length} weeks`);
    console.log("\n✅ Week date regeneration complete!");
  } catch (error) {
    console.error("Error regenerating week dates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

regenerateWeekDates();

/**
 * One-time script to fix week dates in the database
 * Run with: npx tsx scripts/fix-week-dates.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixWeekDates() {
  console.log("Starting week date fix...");

  try {
    const weeks = await prisma.week.findMany({
      orderBy: [{ challengeId: "asc" }, { weekIndex: "asc" }],
    });

    console.log(`Found ${weeks.length} weeks to potentially fix`);

    let fixedCount = 0;

    for (const week of weeks) {
      // Normalize startDate to midnight
      const startDate = new Date(week.startDate);
      startDate.setHours(0, 0, 0, 0);

      // Normalize endDate to 23:59:59.999
      const endDate = new Date(week.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Check if dates need updating
      if (
        startDate.getTime() !== week.startDate.getTime() ||
        endDate.getTime() !== week.endDate.getTime()
      ) {
        await prisma.week.update({
          where: { id: week.id },
          data: {
            startDate,
            endDate,
          },
        });

        console.log(
          `Fixed week ${week.weekIndex}: ${week.startDate.toISOString()} -> ${startDate.toISOString()}`
        );
        fixedCount++;
      }
    }

    console.log(`\nFixed ${fixedCount} weeks`);

    // Now trigger status updates by calling the cron endpoint logic
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

    console.log(`Opened ${weeksToOpen.length} weeks`);

    console.log("\n✅ Week date fix complete!");
  } catch (error) {
    console.error("Error fixing week dates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixWeekDates();

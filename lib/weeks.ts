export type WeekStatus = "UPCOMING" | "OPEN" | "LOCKED";

export interface WeekData {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  status: WeekStatus;
}

/**
 * Generate weeks for a challenge based on start date and number of weeks
 */
export function generateWeeks(
  startDate: Date,
  numberOfWeeks: number
): WeekData[] {
  const weeks: WeekData[] = [];
  const now = new Date();

  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);
    weekStart.setHours(0, 0, 0, 0); // Start at midnight

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // End at 23:59:59.999

    // Determine week status
    let status: WeekStatus;
    if (now < weekStart) {
      status = "UPCOMING";
    } else if (now > weekEnd) {
      status = "LOCKED";
    } else {
      status = "OPEN";
    }

    weeks.push({
      weekIndex: i,
      startDate: weekStart,
      endDate: weekEnd,
      status,
    });
  }

  return weeks;
}

/**
 * Get the current week index for a challenge
 */
export function getCurrentWeekIndex(
  startDate: Date,
  numberOfWeeks: number
): number | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Normalize to start of day

  if (now < start) {
    return null; // Challenge hasn't started
  }

  const daysSinceStart = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekIndex = Math.floor(daysSinceStart / 7);

  if (weekIndex >= numberOfWeeks) {
    return null; // Challenge has ended
  }

  return weekIndex;
}

/**
 * Calculate challenge end date
 */
export function calculateEndDate(
  startDate: Date,
  numberOfWeeks: number
): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + numberOfWeeks * 7 - 1);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
}

/**
 * Check if a challenge is active (ongoing)
 */
export function isChallengeActive(
  startDate: Date,
  numberOfWeeks: number
): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Normalize to start of day

  const end = calculateEndDate(startDate, numberOfWeeks);

  return now >= start && now <= end;
}

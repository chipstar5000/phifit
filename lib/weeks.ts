export type WeekStatus = "UPCOMING" | "OPEN" | "LOCKED";

export interface WeekData {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  status: WeekStatus;
}

const TIMEZONE = "America/New_York";

/**
 * Get the UTC offset in milliseconds for a given date in Eastern Time
 * This properly handles EST/EDT transitions
 */
function getEasternOffsetMs(date: Date): number {
  // Create a formatter that gives us the timezone offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  // offsetPart.value will be like "GMT-5" or "GMT-4"
  const offsetMatch = offsetPart?.value.match(/GMT([+-]\d+)/);
  if (offsetMatch) {
    const hours = parseInt(offsetMatch[1], 10);
    return hours * 60 * 60 * 1000;
  }
  // Fallback to EST (-5 hours)
  return -5 * 60 * 60 * 1000;
}

/**
 * Convert a date to midnight Eastern Time, returned as a UTC Date object
 */
function toMidnightEastern(date: Date): Date {
  // Get the date components in Eastern Time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // Create a date for midnight on this day in Eastern Time
  // We need to figure out what UTC time corresponds to midnight Eastern
  const easternMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const offset = getEasternOffsetMs(easternMidnight);
  // Subtract the offset (e.g., for EST -5, we add 5 hours to get UTC)
  return new Date(easternMidnight.getTime() - offset);
}

/**
 * Convert a date to end of day (23:59:59.999) Eastern Time, returned as a UTC Date object
 */
function toEndOfDayEastern(date: Date): Date {
  // Get the date components in Eastern Time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // Create a date for 23:59:59.999 on this day in Eastern Time
  const easternEndOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const offset = getEasternOffsetMs(easternEndOfDay);
  // Subtract the offset to get UTC
  return new Date(easternEndOfDay.getTime() - offset);
}

/**
 * Generate weeks for a challenge based on start date and number of weeks
 * Week boundaries are calculated in Eastern Time (America/New_York)
 */
export function generateWeeks(
  startDate: Date,
  numberOfWeeks: number
): WeekData[] {
  const weeks: WeekData[] = [];
  const now = new Date();

  for (let i = 0; i < numberOfWeeks; i++) {
    // Calculate the start date for this week
    const baseDate = new Date(startDate);
    baseDate.setDate(baseDate.getDate() + i * 7);

    // Get midnight Eastern Time for the start of the week
    const weekStart = toMidnightEastern(baseDate);

    // Calculate end date (6 days after start)
    const endBaseDate = new Date(baseDate);
    endBaseDate.setDate(endBaseDate.getDate() + 6);

    // Get end of day Eastern Time for the end of the week
    const weekEnd = toEndOfDayEastern(endBaseDate);

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
 * Uses Eastern Time for day boundaries
 */
export function getCurrentWeekIndex(
  startDate: Date,
  numberOfWeeks: number
): number | null {
  const now = new Date();
  const nowMidnight = toMidnightEastern(now);
  const startMidnight = toMidnightEastern(startDate);

  if (now < startMidnight) {
    return null; // Challenge hasn't started
  }

  const daysSinceStart = Math.floor(
    (nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekIndex = Math.floor(daysSinceStart / 7);

  if (weekIndex >= numberOfWeeks) {
    return null; // Challenge has ended
  }

  return weekIndex;
}

/**
 * Calculate challenge end date (in Eastern Time)
 */
export function calculateEndDate(
  startDate: Date,
  numberOfWeeks: number
): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + numberOfWeeks * 7 - 1);
  return toEndOfDayEastern(endDate);
}

/**
 * Check if a challenge is active (ongoing)
 * Uses Eastern Time for day boundaries
 */
export function isChallengeActive(
  startDate: Date,
  numberOfWeeks: number
): boolean {
  const now = new Date();
  const start = toMidnightEastern(startDate);
  const end = calculateEndDate(startDate, numberOfWeeks);

  return now >= start && now <= end;
}

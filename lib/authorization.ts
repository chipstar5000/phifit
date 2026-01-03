import { prisma } from "@/lib/prisma";

/**
 * Verify if a user is the organizer of a challenge
 */
export async function verifyOrganizer(
  challengeId: string,
  userId: string
): Promise<boolean> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { organizerUserId: true },
  });

  if (!challenge) {
    return false;
  }

  return challenge.organizerUserId === userId;
}

/**
 * Verify if a user has participant access to a challenge
 */
export async function verifyParticipantAccess(
  challengeId: string,
  userId: string
): Promise<boolean> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { organizerUserId: true },
  });

  if (!challenge) {
    return false;
  }

  // Organizer always has access
  if (challenge.organizerUserId === userId) {
    return true;
  }

  // Check if user is a participant
  const participant = await prisma.participant.findUnique({
    where: {
      challengeId_userId: {
        challengeId,
        userId,
      },
    },
  });

  return participant !== null;
}

/**
 * Get challenge with organizer verification
 * Returns null if user is not the organizer
 */
export async function getChallengeAsOrganizer(
  challengeId: string,
  userId: string
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge || challenge.organizerUserId !== userId) {
    return null;
  }

  return challenge;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST /api/challenges/[challengeId]/participants - Join challenge or invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;
    const body = await request.json();
    const { email } = body;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        organizerUserId: true,
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // If email provided, organizer is inviting someone
    if (email) {
      if (challenge.organizerUserId !== session.userId) {
        return NextResponse.json(
          { error: "Only organizer can invite participants" },
          { status: 403 }
        );
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User with this email not found" },
          { status: 404 }
        );
      }

      // Check if already participant
      const existingParticipant = await prisma.participant.findUnique({
        where: {
          challengeId_userId: {
            challengeId,
            userId: user.id,
          },
        },
      });

      if (existingParticipant) {
        return NextResponse.json(
          { error: "User is already a participant" },
          { status: 409 }
        );
      }

      // Add participant
      const participant = await prisma.participant.create({
        data: {
          challengeId,
          userId: user.id,
          buyInPaid: false,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({ participant }, { status: 201 });
    }

    // Self-join (for now, challenges are invite-only in v1)
    return NextResponse.json(
      { error: "Challenge joining not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Add participant error:", error);
    return NextResponse.json(
      { error: "Failed to add participant" },
      { status: 500 }
    );
  }
}

// DELETE /api/challenges/[challengeId]/participants - Remove participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { challengeId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { organizerUserId: true },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Only organizer can remove others, or user can remove themselves
    if (
      challenge.organizerUserId !== session.userId &&
      userId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Not authorized to remove this participant" },
        { status: 403 }
      );
    }

    // Can't remove organizer
    if (userId === challenge.organizerUserId) {
      return NextResponse.json(
        { error: "Cannot remove organizer from challenge" },
        { status: 400 }
      );
    }

    await prisma.participant.delete({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove participant error:", error);
    return NextResponse.json(
      { error: "Failed to remove participant" },
      { status: 500 }
    );
  }
}

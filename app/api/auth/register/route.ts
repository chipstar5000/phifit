import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateEmail,
  validatePin,
  hashPin,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName, pin } = body;

    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: "Display name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { error: pinValidation.error },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash PIN
    const pinHash = await hashPin(pin);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName: displayName.trim(),
        pinHash,
        lastLoginAt: new Date(),
      },
    });

    // Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}

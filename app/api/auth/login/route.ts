import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateEmail,
  validatePin,
  verifyPin,
  setSessionCookie,
} from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// Force Node.js runtime (required for argon2)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, pin } = body;

    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
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

    // Rate limiting
    const normalizedEmail = email.toLowerCase().trim();
    const rateLimitResult = checkRateLimit(`login:${normalizedEmail}`);

    if (!rateLimitResult.allowed) {
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.lockedUntil! - Date.now()) / 60000
      );

      return NextResponse.json(
        {
          error: `Too many failed attempts. Account locked for ${minutesUntilReset} minutes.`,
          lockedUntil: rateLimitResult.lockedUntil,
        },
        { status: 429 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or PIN" },
        { status: 401 }
      );
    }

    // Verify PIN
    const pinValid = await verifyPin(pin, user.pinHash);

    if (!pinValid) {
      return NextResponse.json(
        {
          error: "Invalid email or PIN",
          remaining: rateLimitResult.remaining,
        },
        { status: 401 }
      );
    }

    // Success - reset rate limit and create session
    resetRateLimit(`login:${normalizedEmail}`);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

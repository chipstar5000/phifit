import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

export interface SessionPayload {
  userId: string;
  email: string;
  [key: string]: unknown;
}

// PIN validation
export function validatePin(pin: string): { valid: boolean; error?: string } {
  if (!pin || typeof pin !== "string") {
    return { valid: false, error: "PIN is required" };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "PIN must contain only digits" };
  }

  if (pin.length < 4 || pin.length > 6) {
    return { valid: false, error: "PIN must be 4-6 digits" };
  }

  return { valid: true };
}

// Hash PIN using bcrypt (Vercel-compatible, pure JavaScript)
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pin, salt);
}

// Verify PIN against hash
export async function verifyPin(
  pin: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}

// Create JWT session
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

// Verify JWT session
export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSession(payload);
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Get session from cookie
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  return await verifySession(token);
}

// Clear session cookie
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Email validation
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

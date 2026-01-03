import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  try {
    await clearSession();

    // Redirect to login page with success message
    return NextResponse.redirect(new URL("/login?logout=success", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * POST /api/auth/logout
 * Invalide la session en supprimant le cookie httpOnly.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

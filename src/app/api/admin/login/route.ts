import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, adminSessionToken, isPasscodeCorrect, isRouteSecretCorrect } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { passcode, secret } = (await req.json()) as { passcode?: string; secret?: string };

  if (!secret || !isRouteSecretCorrect(secret) || !passcode || !isPasscodeCorrect(passcode)) {
    return NextResponse.json({ ok: false, error: "Invalid passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, adminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

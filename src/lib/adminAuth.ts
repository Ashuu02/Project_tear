import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "tear_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function isPasscodeCorrect(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  const a = Buffer.from(sha256(input));
  const b = Buffer.from(sha256(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isRouteSecretCorrect(secret: string): boolean {
  const expected = process.env.ADMIN_ROUTE_SECRET;
  if (!expected) return false;
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(sha256(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminSessionToken(): string {
  const passcode = process.env.ADMIN_PASSCODE ?? "";
  return sha256(`tear-admin:${passcode}`);
}

export function isValidAdminCookie(cookieValue: string | undefined): boolean {
  if (!cookieValue || !process.env.ADMIN_PASSCODE) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(adminSessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

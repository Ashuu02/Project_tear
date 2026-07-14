import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function isValidHttpUrl(url: string | undefined): boolean {
  if (!url || url === "#") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    // Reject placeholder hostnames like "..." (LLMs sometimes echo the "https://..." example
    // from prompt templates verbatim when no real source URL was found).
    return parsed.hostname.split(".").some((label) => /[a-z0-9]/i.test(label));
  } catch {
    return false;
  }
}
